import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "react-oidc-context";
import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "eu-north-1_8yyUAqEPA",
      userPoolClientId: "7rj7dbo04a7n5ecq3isl3b4t8n",
    },
  },
});

const cognitoAuthConfig = {
  authority: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_8yyUAqEPA",
  client_id: "7rj7dbo04a7n5ecq3isl3b4t8n",
  redirect_uri: window.location.origin + "/",
  response_type: "code",
  scope: "openid email phone",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);