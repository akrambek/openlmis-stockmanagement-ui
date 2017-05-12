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

(function () {

  'use strict';

  /**
   * @ngdoc service
   * @name stock-physical-inventory.physicalInventoryService
   *
   * @description
   * Responsible for retrieving all physical inventory information from server.
   */
  angular
    .module('stock-orderable-lot-util')
    .service('orderableLotUtilService', service);

  service.$inject = ['messageService'];

  function service(messageService) {
    var noLotDefined = {lotCode: messageService.get('orderableLotUtilService.noLotDefined')};

    this.groupByOrderableId = function (items) {
      return _.chain(items)
        .groupBy(function (item) {
          return item.orderable.id;
        }).values().value();
    };

    this.findByLotInOrderableGroup = function (orderableGroup, selectedLot) {
      return _.chain(orderableGroup)
        .find(function (groupItem) {
          var selectedNoLot = !groupItem.lot && (!selectedLot || selectedLot == noLotDefined);
          var lotMatch = groupItem.lot && groupItem.lot === selectedLot;
          return selectedNoLot || lotMatch;
        }).value();
    };

    this.lotsOf = function (orderableGroup) {
      var lots = _.chain(orderableGroup).pluck('lot').compact().value();
      if (lots.length > 0) {
        lots.unshift(noLotDefined);//add no lot defined as an option
      }
      return lots;
    };

  }

})();
