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
     * @ngdoc controller
     * @name admin-reason-add.controller:AdminReasonAddController
     *
     * @description
     * Exposes method for creating/updating reason to the modal view.
     */
    angular
        .module('admin-reason-add')
        .controller('AdminReasonAddController', controller);

    controller.$inject = [
        'REASON_TYPES', 'REASON_CATEGORIES', 'reasons', 'programs', 'facilityTypes', 'availableTags', 'reasonTypes',
        'reasonCategories', 'reason', 'facilityTypesMap', 'programsMap'
    ];

    function controller(REASON_TYPES, REASON_CATEGORIES, reasons, programs, facilityTypes, availableTags, reasonTypes,
                        reasonCategories, reason, facilityTypesMap, programsMap) {
        var vm = this;

        vm.$onInit = onInit;
        vm.addAssignment = addAssignment;
        vm.validateReasonName = validateReasonName;
        vm.getCategoryLabel = REASON_CATEGORIES.getLabel;
        vm.getTypeLabel = REASON_TYPES.getLabel;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {Reason}
         * @name reason
         *
         * @description
         * Reason that is being created.
         */
        vm.reason = undefined;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {Array}
         * @name reasonTypes
         *
         * @description
         * The list of reason types that can be used for creating new reason.
         */
        vm.reasonTypes = undefined;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {Array}
         * @name reasonCategories
         *
         * @description
         * The list of reason categories that can be used for creating new reason.
         */
        vm.reasonCategories = undefined;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {Array}
         * @name programs
         *
         * @description
         * The list of programs available in the system.
         */
        vm.programs = undefined;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {Array}
         * @name facilityTypes
         *
         * @description
         * The list of facility types available in the system.
         */
        vm.facilityTypes = undefined;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {boolean}
         * @name showReason
         *
         * @description
         * Flag defining whether the reason should be visible with the newly created assignment.
         */
        vm.showReason = undefined;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {Array}
         * @name availableTags
         *
         * @description
         * The list of all available tags user throughout other reasons.
         */
        vm.availableTags = undefined;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {Array}
         * @name facilityTypesMap
         *
         * @description
         * The map of facility type names by ids.
         */
        vm.facilityTypesMap = undefined;

        /**
         * @ngdoc property
         * @propertyOf admin-reason-add.controller:AdminReasonAddController
         * @type {Array}
         * @name programsMap
         *
         * @description
         * The map of program names by ids.
         */
        vm.programsMap = undefined;

        /**
         * @ngdoc method
         * @methodOf admin-reason-add.controller:AdminReasonAddController
         * @name $onInit
         *
         * @description
         * Initialization method of the AdminReasonAddController.
         */
        function onInit() {
            vm.reason = reason;
            vm.reasonTypes = reasonTypes;
            vm.reasonCategories = reasonCategories;
            vm.programs = programs;
            vm.facilityTypes = facilityTypes;
            vm.showReason = true;
            vm.availableTags = availableTags;
            vm.programsMap = programsMap;
            vm.facilityTypesMap = facilityTypesMap;
        }

        /**
         * @ngdoc method
         * @methodOf admin-reason-add.controller:AdminReasonAddController
         * @name addAssignment
         *
         * @description
         * Adds valid reason assignment.
         *
         * @return {Promise} the promise resolving to the added assignment.
         */
        function addAssignment() {
            return vm.reason.addAssignment({
                program: vm.selectedProgram,
                facilityType: vm.selectedFacilityType,
                hidden: !vm.showReason
            })
                .then(function() {
                    vm.selectedProgram = undefined;
                    vm.selectedFacilityType = undefined;
                    vm.showReason = true;
                });
        }

        /**
         * @ngdoc method
         * @methodOf admin-reason-add.controller:AdminReasonAddController
         * @name validateReasonName
         *
         * @description
         * Validates the entered reason name.
         *
         * @return {String} the error message key, undefined if reason is valid
         */
        function validateReasonName() {
            if (isReasonNameDuplicated()) {
                return 'adminReasonAdd.reasonNameDuplicated';
            }
        }

        function isReasonNameDuplicated() {
            if (!vm.reason || !vm.reason.name) {
                return false;
            }

            return reasons.filter(function(reason) {
                return ((reason.name.toUpperCase() === vm.reason.name.toUpperCase()) && reason.id !== vm.reason.id);
            }).length;
        }

    }
})();