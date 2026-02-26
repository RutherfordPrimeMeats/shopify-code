# Blocked Days App - Deployment Guide

This guide walks you through setting up Google Cloud Platform (GCP) to host the Blocked Days Node.js application, including continuous deployment with Cloud Build, database provisioning with Firestore, and hosting via Cloud Run.

## Prerequisites
- A Google Cloud Platform (GCP) account.
- A GitHub repository containing the `blocked-days` codebase.
- The Google Cloud SDK (`gcloud`) installed locally (optional, but recommended).

---

## 1. Setup Your Google Cloud Project

1. Log in to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Project (e.g., `blocked-days-web`) or select an existing one.
3. Ensure billing is enabled for your project.

### Enable the Required APIs
In your project, enable the following APIs from the [API Library](https://console.cloud.google.com/apis/library):
- **Cloud Run API**
- **Cloud Build API**
- **Artifact Registry API** (or Container Registry API)
- **Cloud Firestore API**
- **Secret Manager API** (if you decide to use secrets for environment vars)

---

## 2. Configure Cloud Firestore (Database)

1. Navigate to the **Firestore** section in the Cloud Console navigation menu.
2. Click **Create Database**.
3. Choose **Native mode** (recommended for web applications) vs. Datastore mode.
4. Select a location closest to your users (e.g., `us-central1` or `europe-west1`), ensuring it matches where you plan to deploy Cloud Run to minimize latency.
5. Setup the **Security Rules**. For this app (where the server SDK talks to Firestore), the default "Locked Mode" is acceptable, as the Node.js Admin/Server SDK bypasses security rules entirely using service account credentials.

---

## 3. Set Up Continuous Deployment with Cloud Build

We will link your GitHub repository to Google Cloud Build so it redeploys automatically upon push.

1. Navigate to **Cloud Build > Triggers** in the Cloud Console.
2. Click **Create Trigger**.
3. Under **Event**, choose *Push to a branch*.
4. Under **Source**, connect a new repository. Choose **GitHub** and follow the authorization prompts to connect your specific `blocked-days` repository. Select the production branch (e.g., `main` or `master`).
5. Under **Configuration**, choose **Cloud Build configuration file (yaml or json)**.
6. The location should be `/cloudbuild.yaml`.
7. **Service Account:** Ensure the Cloud Build service account has the necessary permissions. You might need to grant the `Cloud Run Admin` and `Service Account User` roles to the default Cloud Build service account under the IAM settings, so it can deploy new revisions.
8. Click **Create**.

---

## 4. Initial Manual Deployment (Optional)

You can trigger a manual run to establish the Cloud Run service the first time.
- Push your code to GitHub to fire the trigger, OR
- Run this locally using the gcloud CLI:
  ```bash
  gcloud builds submit --config cloudbuild.yaml .
  ```

---

## 5. Configure Cloud Run Environment Variables

Once the service is created in Cloud Run via Cloud Build, you need to configure its environment variables so the app can communicate with Shopify, establish webauthn, and encrypt sessions.

1. Navigate to **Cloud Run** in the Google Cloud Console.
2. Click on the newly deployed service (e.g., `blocked-days`).
3. Click **Edit & Deploy New Revision** at the top.
4. Scroll down and open the **Variables & Secrets** tab.
5. Add the following **Environment Variables**:

   - `NODE_ENV`: Set to `production`.
   - `SESSION_SECRET`: A long, random string (e.g., `h4sh3d-r4ndom-str1ng-f0r-s3ss10ns`).
   - `SHOPIFY_API_SECRET`: The password/secret key required to authenticate with the Shopify API.
   - `SHOPIFY_BASE_URL`: Your Shopify store domain (e.g., `shopname.myshopify.com` — do **not** include the `https://` prefix).
   - `WEBAUTHN_RP_ID`: The public domain of your Cloud Run service (e.g., `blocked-days-abcdefg-uc.a.run.app`). **Do not include `https://`, just the domain name.**

6. **Permissions / Service Account:**
   The Cloud Run service needs permission to read/write from Firestore. Make sure the service identity (usually the default compute service account) has the `Cloud Datastore User` role. 

7. Scroll down to the bottom and click **Deploy**.

---

## 6. Access Your Application and Initialize

1. Once the deployment secures the environment variables, copy the service URL shown at the top of your Cloud Run dashboard (e.g., `https://blocked-days-abcdefg-uc.a.run.app`).
2. Visit the URL in your browser.
3. Provide a username and choose to register a new passkey. You will automatically be created as a **guest**.
4. To grant yourself access:
   - Go to your GCP **Firestore** dashboard.
   - Navigate to the `users` collection.
   - Find your username document.
   - Change the `role` field from `guest` to `admin`.
5. Return to the application, log out, and log back in. 
6. You now have access to the Dashboard and Admin pages.

Enjoy your deployed application!
