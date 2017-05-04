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
   * @ngdoc controller
   * @name stock-adjustment-creation.controller:StockAdjustmentCreationController
   *
   * @description
   * Controller for managing stock adjustment creation.
   */
  angular
    .module('stock-adjustment-creation')
    .controller('StockAdjustmentCreationController', controller);

  controller.$inject =
    ['$scope', '$state', '$stateParams', '$filter', 'confirmDiscardService', 'program', 'facility',
      'stockCardSummaries', 'reasons', 'confirmService', 'messageService', 'user',
      'stockAdjustmentCreationService', 'notificationService', 'orderableLotUtilService'];

  function controller($scope, $state, $stateParams, $filter, confirmDiscardService, program,
                      facility, stockCardSummaries, reasons, confirmService, messageService, user,
                      stockAdjustmentCreationService, notificationService,
                      orderableLotUtilService) {
    var vm = this;

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name search
     *
     * @description
     * It searches from the total line items with given keyword. If keyword is empty then all line
     * items will be shown.
     */
    vm.search = function () {
      vm.displayItems = stockAdjustmentCreationService.search(vm.keyword, vm.addedLineItems);

      $stateParams.addedLineItems = vm.addedLineItems;
      $stateParams.displayItems = vm.displayItems;
      $stateParams.keyword = vm.keyword;
      $stateParams.page = getPageNumber();
      $state.go($state.current.name, $stateParams, {reload: true, notify: false});
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name addProduct
     *
     * @description
     * Add a product for stock adjustment.
     */
    vm.addProduct = function () {
      var occurredDate = new Date();
      occurredDate.setFullYear(vm.selectedOccurredDate.getFullYear());
      occurredDate.setMonth(vm.selectedOccurredDate.getMonth());
      occurredDate.setDate(vm.selectedOccurredDate.getDate());

      var reasonFreeText = vm.selectedReason.isFreeTextAllowed ? vm.reasonFreeText : null;
      var selectedItem = orderableLotUtilService
        .findByLotInOrderableGroup(vm.selectedOrderableGroup, vm.selectedLot);

      vm.addedLineItems.unshift(angular.merge({
        occurredDate: occurredDate,
        reason: vm.selectedReason,
        reasonFreeText: reasonFreeText
      }, selectedItem));

      vm.search();
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name remove
     *
     * @description
     * Remove a line item from added products.
     *
     * @param {Object} lineItem line item to be removed.
     */
    vm.remove = function (lineItem) {
      var index = vm.addedLineItems.indexOf(lineItem);
      vm.addedLineItems.splice(index, 1);

      vm.search();
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name removeDisplayItems
     *
     * @description
     * Remove all displayed line items.
     */
    vm.removeDisplayItems = function () {
      confirmService.confirmDestroy('stockAdjustmentCreation.clearAll',
        'stockAdjustmentCreation.clear')
        .then(function () {
          vm.addedLineItems = _.difference(vm.addedLineItems, vm.displayItems);
          vm.displayItems = [];
        });
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name validateQuantity
     *
     * @description
     * Validate line item quantity and returns self.
     *
     * @param {Object} lineItem line item to be validated.
     *
     */
    vm.validateQuantity = function (lineItem) {
      if (lineItem.quantity >= 1) {
        lineItem.quantityInvalid = undefined;
      } else {
        lineItem.quantityInvalid = messageService.get('stockAdjustmentCreation.positiveInteger');
      }
      return lineItem;
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name clearFreeText
     *
     * @description
     *
     * remove reason free text from given object.
     *
     * @param {Object} obj given target to be changed.
     */
    vm.clearFreeText = function (obj) {
      obj.reasonFreeText = null;
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name submit
     *
     * @description
     * Submit all added items.
     *
     */
    vm.submit = function () {
      if (validateAllAddedItems()) {
        var confirmMessage = messageService.get('stockAdjustmentCreation.confirmAdjustment', {
          username: user.username,
          number: vm.addedLineItems.length
        });
        confirmService.confirm(confirmMessage, 'stockAdjustmentCreation.confirm').then(confirmSubmit);
      } else {
        vm.keyword = null;
        reorderItems();
      }
    };

    vm.lotsOf = orderableLotUtilService.lotsOf;

    function validateAllAddedItems() {
      return _.chain(vm.addedLineItems)
        .map(vm.validateQuantity)
        .groupBy(function (item) {
          return item.lot ? item.lot.id : item.orderable.id;
        }).values()
        .map(validateDebitQuantity).flatten()
        .all(function (item) {
          return !item.quantityInvalid;
        }).value();
    }

    function reorderItems() {
      var sorted = $filter('orderBy')(vm.addedLineItems, ['orderable.productCode', '-occurredDate']);

      vm.displayItems = _.chain(sorted).groupBy(function (item) {
        return item.lot ? item.lot.id : item.orderable.id;
      }).sortBy(function (group) {
        return _.every(group, function (item) {
          return !item.quantityInvalid;
        });
      }).flatten(true).value();
    }

    function confirmSubmit() {
      stockAdjustmentCreationService.submitAdjustments(program.id, facility.id, vm.addedLineItems)
        .then(function () {
          notificationService.success('stockAdjustmentCreation.submitted');

          $stateParams.facilityId = facility.id;
          $state.go('openlmis.stockmanagement.stockCardSummaries', $stateParams);
        }, function () {
          notificationService.error('stockAdjustmentCreation.submitFailed');
        });
    }

    function validateDebitQuantity(items) {
      var sortedItems = $filter('orderBy')(items, 'occurredDate');
      var previousSoh = sortedItems[0].stockOnHand ? sortedItems[0].stockOnHand : 0;

      _.forEach(sortedItems, function (item) {
        item.stockOnHand = previousSoh;

        if (item.reason.reasonType === 'CREDIT') {
          previousSoh += parseInt(item.quantity || 0);
        } else if (item.reason.reasonType === 'DEBIT') {
          previousSoh -= parseInt(item.quantity || 0);
          if (previousSoh < 0) {
            item.quantityInvalid = messageService.get('stockAdjustmentCreation.sohCanNotBeNegative');
          }
        }
      });
      return sortedItems;
    }

    function onInit() {
      $state.current.label = messageService.get('stockAdjustmentCreation.title', {
        'facilityCode': facility.code,
        'facilityName': facility.name,
        'program': program.name
      });

      initViewModel();
      initStateParams();

      $scope.needToConfirm = true;
      confirmDiscardService.register($scope, 'openlmis.stockmanagement.stockCardSummaries');

      $scope.$on('$stateChangeStart', function () {
        angular.element('.popover').popover('destroy');
      });
    }

    function initViewModel() {
      //Set the max-date of date picker to the end of the current day.
      vm.maxDate = new Date();
      vm.maxDate.setHours(23, 59, 59, 999);
      vm.selectedOccurredDate = vm.maxDate;

      vm.program = program;
      vm.facility = facility;
      vm.reasons = reasons;
      vm.addedLineItems = $stateParams.addedLineItems || [];
      vm.displayItems = $stateParams.displayItems || [];
      vm.keyword = $stateParams.keyword;

      vm.hasLot = _.any(stockCardSummaries, function (summary) {
        return summary.lot;
      });

      vm.orderableGroups = orderableLotUtilService.groupByOrderableId(stockCardSummaries);
    }

    function initStateParams() {
      $stateParams.page = getPageNumber();
      $stateParams.program = program;
      $stateParams.facility = facility;
      $stateParams.reasons = reasons;
      $stateParams.stockCardSummaries = stockCardSummaries;
    }

    function getPageNumber() {
      var totalPages = Math.ceil(vm.displayItems.length / parseInt($stateParams.size));
      var pageNumber = parseInt($state.params.page || 0);
      if (pageNumber > totalPages - 1) {
        return totalPages > 0 ? totalPages - 1 : 0;
      }
      return pageNumber;
    }

    onInit();
  }
})();