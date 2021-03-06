angular.module('proton.core')
    .directive('paypalView', (notify, Payment, gettextCatalog, CONSTANTS) => {

        const { MIN_PAYPAL_AMOUNT } = CONSTANTS;
        const I18N = {
            down: gettextCatalog.getString('Error connecting to PayPal.', null, 'Paypal component')
        };

        const notifyDanger = (message) => notify({ message, classes: 'notification-danger' });

        return {
            replace: true,
            restrict: 'E',
            templateUrl: 'templates/directives/core/paypalView.tpl.html',
            scope: {
                amount: '=',
                currency: '=',
                paypalCallback: '=callback'
            },
            link(scope) {
                let childWindow;

                scope.initPaypal = () => {
                    scope.errorDetails = null;
                    scope.paypalNetworkError = false;
                    const Amount = scope.amount;

                    if (Amount < MIN_PAYPAL_AMOUNT) {
                        return scope.errorDetails = {
                            type: 'validator.amount',
                            minAmount: MIN_PAYPAL_AMOUNT
                        };
                    }

                    Payment.paypal({ Amount, Currency: scope.currency })
                        .then(({ data = {} } = {}) => {
                            if (data.Code === 1000) {
                                return data;
                            }
                            if (data.Code === 22802) {
                                scope.paypalNetworkError = true;
                            }
                            throw new Error(data.Error || I18N.down);
                        })
                        .then(({ ApprovalURL }) => scope.approvalURL = ApprovalURL)
                        .catch((error) => notifyDanger(error.message));
                };

                scope.openPaypalTab = () => {
                    childWindow = window.open(scope.approvalURL, 'PayPal');
                    window.addEventListener('message', receivePaypalMessage, false);
                };

                function receivePaypalMessage(event) {
                    const origin = event.origin || event.originalEvent.origin; // For Chrome, the origin property is in the event.originalEvent object.

                    if (origin !== 'https://secure.protonmail.com') {
                        return;
                    }

                    const { payerID: PayerID, paymentID: PaymentID, cancel: Cancel } = event.data;

                    childWindow.close();
                    window.removeEventListener('message', receivePaypalMessage, false);
                    scope.paypalCallback({ PayerID, PaymentID, Cancel });
                }

                scope.initPaypal();
            }
        };
    });
