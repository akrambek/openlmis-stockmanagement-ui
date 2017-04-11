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
   * @name stockmanagement-confirmDiscard.confirmDiscardService
   *
   * @description
   * Service allows to register handler on window's beforeunload event and confirm service.
   */

  angular.module('stockmanagement-confirm-discard')
    .service('confirmDiscardService', confirmDiscardService);

  confirmDiscardService.$inject = ['$state', 'loadingModalService', 'confirmService'];

  function confirmDiscardService($state, loadingModalService, confirmService) {

    /**
     * @ngdoc method
     * @methodOf stockmanagement-confirmDiscard.confirmDiscardService
     * @name confirm
     *
     * @description
     * Register handler on window's beforeunload event and confirm service.
     */
    this.register = function register(scope) {
      var isConfirmQuit = false;
      var isConfirmModalOpening = false;
      window.onbeforeunload = function () {
        // According to the document of https://www.chromestatus.com/feature/5349061406228480,
        // we can't custom messages in onbeforeunload dialogs now.
        return '';
      };

      scope.$on('$stateChangeStart', function (event, toState) {
        if (shouldConfirmTransition(toState, isConfirmQuit)) {
          event.preventDefault();
          loadingModalService.close();
          if (!isConfirmModalOpening) {
            confirmService.confirm('msg.stockmanagement.discardDraft').then(function () {
              isConfirmQuit = true;
              isConfirmModalOpening = false;
              window.onbeforeunload = null;
              $state.go(toState.name);
            }, function () {
              isConfirmModalOpening = false;
            });
          }
          isConfirmModalOpening = true;
        } else {
          window.onbeforeunload = null;
        }
      });
    };

    function shouldConfirmTransition(toState, isConfirmQuit) {
      var isPreventedState = toState.name !== 'auth.login' && toState.name !== 'stockmanagement.stockCardsSummaries';
      return toState.name !== $state.current.name && !isConfirmQuit && isPreventedState;
    }
  }
})();