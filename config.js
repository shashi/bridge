// This is the configuration file. It is loaded at the end.

// Configure Accounts UI
if (Meteor.isClient) {
    Accounts.ui.config({
        passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
    });
}
