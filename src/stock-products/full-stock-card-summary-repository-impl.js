/*
 * This program is part of the OpenLMIS logistics management information system platform software.
 * Copyright © 2017 VillageReach
 *
 * This program is free software: you can redistribute it and/or modify it under the terms
 * of the GNU Affero General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU Affero General Public License for more details. You should have received a copy of
 * the GNU Affero General Public License along with this program. If not, see
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org. 
 */

(function() {

    'use strict';

    /**
     * @ngdoc service
     * @name stock-products.FullStockCardSummaryRepositoryImpl
     *
     * @description
     * Implementation of the StockCardSummary interface. Communicates with the REST API of the OpenLMIS server.
     * Adds stock-less trade items and lots to the response.
     */
    angular
        .module('stock-products')
        .factory('FullStockCardSummaryRepositoryImpl', FullStockCardSummaryRepositoryImpl);

    FullStockCardSummaryRepositoryImpl.$inject = ['$resource', 'stockmanagementUrlFactory', 'LotRepositoryImpl', 
        'OrderableRepositoryImpl', '$q', 'OrderableFulfillsResource', 'StockCardSummaryResource'];

    function FullStockCardSummaryRepositoryImpl($resource, stockmanagementUrlFactory, LotRepositoryImpl, 
        OrderableRepositoryImpl, $q, OrderableFulfillsResource, StockCardSummaryResource) {

        FullStockCardSummaryRepositoryImpl.prototype.query = query;

        return FullStockCardSummaryRepositoryImpl;

        /**
         * @ngdoc method
         * @methodOf stock-products.FullStockCardSummaryRepositoryImpl
         * @name FullStockCardSummaryRepositoryImpl
         * @constructor
         *
         * @description
         * Creates an instance of the FullStockCardSummaryRepositoryImpl class.
         */
        function FullStockCardSummaryRepositoryImpl() {
            this.lotRepositoryImpl = new LotRepositoryImpl();
            this.orderableRepositoryImpl = new OrderableRepositoryImpl();
            this.orderableFulfillsResource = new OrderableFulfillsResource();

            this.resource = new StockCardSummaryResource();
        }

        /**
         * @ngdoc method
         * @methodOf stock-products.FullStockCardSummaryRepositoryImpl
         * @name query
         *
         * @description
         * Retrieves a page of stock card summaries from the OpenLMIS server.
         * Communicates with the endpoint of the Stock Cards Summaries V2 REST API.
         * Adds stock-less trade items and lots to the response.
         *
         * @param  {Object}  params request query params
         * @return {Promise}        page of stock card summaries
         */
        function query(params) {
            var lotRepositoryImpl = this.lotRepositoryImpl,
                orderableRepositoryImpl = this.orderableRepositoryImpl,
                orderableFulfillsResource = this.orderableFulfillsResource;

            return this.resource.query(params)
            .then(function(stockCardSummariesPage) {
                return addMissingStocklessProducts(stockCardSummariesPage, orderableFulfillsResource, lotRepositoryImpl, orderableRepositoryImpl);
            });
        }

        function addMissingStocklessProducts(summaries, orderableFulfillsResource, lotRepositoryImpl, orderableRepositoryImpl) {
            var commodityTypeIds = summaries.content.map(function(summary) {
                return summary.orderable.id;
            });

            return orderableFulfillsResource.query({
                id: commodityTypeIds
            })
            .then(function(orderableFulfills) {

                addGenericOrderables(orderableFulfills, summaries);

                var orderableIds = reduceToOrderableIds(orderableFulfills);

                return orderableRepositoryImpl.query({
                    id: orderableIds
                })
                .then(function(orderablePage) {
                    var tradeItemIds = orderablePage.content.reduce(function(ids, orderable) {
                        if (orderable.identifiers.tradeItem) {
                            ids.add(orderable.identifiers.tradeItem);
                        }
                        return ids;
                    }, new Set());

                    return lotRepositoryImpl.query({
                        tradeItemId: Array.from(tradeItemIds)
                    })
                    .then(function(lotPage) {
                        var lotMap = mapLotsByTradeItems(lotPage.content, orderablePage.content);
                        var orderableMap = mapOrderablesById(orderablePage.content);

                        summaries.content.forEach(function(summary) {
                            summary.orderable = orderableMap[summary.orderable.id];

                            summary.canFulfillForMe.forEach(function(fulfill) {
                                fulfill.orderable = orderableMap[fulfill.orderable.id];
                                
                                if (fulfill.lot) {
                                    fulfill.lot = lotPage.content.filter(function(lot) {
                                        return lot.id === fulfill.lot.id;
                                    })[0];
                                }
                            });

                            if (orderableFulfills[summary.orderable.id].canFulfillForMe) {
                                orderableFulfills[summary.orderable.id].canFulfillForMe.forEach(function(orderableId) {
                                    lotMap[orderableId].forEach(function(lot) {
                                        if (!hasOrderableWithLot(summary, orderableId, lot.id)) {
                                            summary.canFulfillForMe.push(createCanFulfillForMeEntry(orderableMap[orderableId], lot));
                                        }
                                    });
        
                                    if (!hasOrderableWithLot(summary, orderableId, null)) {                                    
                                        summary.canFulfillForMe.push(createCanFulfillForMeEntry(orderableMap[orderableId], null));
                                    }
                                });
                            }
                        });

                        return summaries;
                    });
                });
            });
        }

        function addGenericOrderables(orderableFulfills, summaries) {
            summaries.content.forEach(function(summary) {
                if (!orderableFulfills[summary.orderable.id]) {
                    orderableFulfills[summary.orderable.id] = {
                        canFulfillForMe: []
                    };
                }
            });

            Object.keys(orderableFulfills).forEach(function(commodityTypeId) {
                if (orderableFulfills[commodityTypeId].canFulfillForMe && 
                    orderableFulfills[commodityTypeId].canFulfillForMe.length === 0) {
                    orderableFulfills[commodityTypeId].canFulfillForMe.push(commodityTypeId);
                }
            });
        }

        function reduceToOrderableIds(orderableFulfills) {
            return Array.from(Object.keys(orderableFulfills).reduce(function(ids, commodityTypeId) {
                if (orderableFulfills[commodityTypeId].canFulfillForMe) {
                    orderableFulfills[commodityTypeId].canFulfillForMe.forEach(function(tradeItemId) {
                        ids.add(tradeItemId);
                    });
                    ids.add(commodityTypeId);
                }
                return ids;
            }, new Set()));
        }

        function mapLotsByTradeItems(lots, orderables) {
            return orderables.reduce(function(map, orderable) {
                map[orderable.id] = [];
                if (orderable.identifiers.tradeItem) {
                    lots.forEach(function(lot) {
                        if (lot.tradeItemId.toLowerCase() === orderable.identifiers.tradeItem.toLowerCase()) {
                            map[orderable.id].push(lot);
                        }
                    });
                }
                return map;
            }, {});            
        }

        function mapOrderablesById(orderables) {
            return orderables.reduce(function(map, orderable) {
                map[orderable.id] = orderable;
                return map;
            }, {});            
        }

        function createCanFulfillForMeEntry(orderable, lot) {
            return {
                lot: lot,
                occurredDate: null,
                orderable: orderable,
                processedDate: null,
                stockCard: null,
                stockOnHand: null
            };
        }

        function hasOrderableWithLot(summary, orderableId, lotId) {
            return summary.canFulfillForMe
            .filter(function(summaryEntry) {
                if (!lotId) {
                    return !summaryEntry.lot && summaryEntry.orderable.id === orderableId;
                } else {
                    return summaryEntry.lot && summaryEntry.lot.id === lotId && summaryEntry.orderable.id === orderableId;
                }
            }).length > 0;
        }
    }
})();
