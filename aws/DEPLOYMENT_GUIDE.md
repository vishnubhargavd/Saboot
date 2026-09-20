# Saboot — AWS Public HTTPS Deployment Guide

This guide outlines the simplest, most reliable AWS deployment for **Saboot — Zero-Trust Delivery Attestation Engine**, providing a public HTTPS endpoint for the Admin Operations Console, the Customer Verification Portal, real-time SSE updates, and live Resend email integration.

---

## 🏗️ Architecture

```text
Internet
   │
   ▼
AWS Public HTTPS Endpoint (App Runner / ALB)
   │
   ▼
Saboot Node.js Backend (Port 3001)
   ├── Admin Operations Console (/ & /index.html)
   ├── Customer Verification Portal (/verify/:deliveryId)
   ├── Real-Time Server-Sent Events (GET /api/events)
   ├── Zero-Trust Verification API (POST /api/verify)
   ├── Persistent Ledger (admin/data/deliveries.json)
   └── Resend Transactional Email Engine (Resend API)
```

---

## 🚀 Option 1: 1-Click Deployment via AWS App Runner (Recommended)

AWS App Runner provides an automatic public HTTPS domain (e.g., `https://xyz.us-east-1.awsapprunner.com`), zero-configuration SSL/TLS certificates, continuous deployments from your GitHub branch, and native support for Node.js long-lived connections (SSE).

### Steps in AWS Management Console:

1. Open **AWS Management Console** and navigate to **App Runner**.
2. Click **Create service**.
3. **Source code repository**:
   * Repository provider: **GitHub**
   * Repository: `vishnubhargavd/Saboot`
   * Branch: `feature/saboot-ai-zero-trust`
   * Deployment trigger: **Automatic**
4. **Configuration**:
   * Configuration file: Select **Use a configuration file** (`apprunner.yaml` already included in repository root).
5. **Service settings**:
   * Service name: `saboot-zero-trust-engine`
   * Virtual CPU & Memory: **1 vCPU, 2 GB**
6. **Environment variables**:
   Add the following secrets/configuration:
   * `EMAIL_PROVIDER`: `resend`
   * `RESEND_API_KEY`: `<Your-Resend-API-Key>`
   * `EMAIL_FROM`: `onboarding@resend.dev`
   * `PORT`: `3001`
   * `CUSTOMER_PORTAL_BASE_URL`: `https://<your-service-url>.awsapprunner.com` *(Update after initial deployment once the domain is provisioned)*
7. Click **Create & deploy**.

---

## ⚙️ Option 2: CloudFormation / AWS CLI

If you have the AWS CLI configured:

```bash
aws cloudformation deploy \
  --template-file aws/template.yaml \
  --stack-name saboot-public-service \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    RepositoryUrl=https://github.com/vishnubhargavd/Saboot \
    BranchName=feature/saboot-ai-zero-trust \
    EmailFrom=onboarding@resend.dev
```

---

## 🐳 Option 3: AWS Lightsail or ECS Fargate Container

A production `Dockerfile` is provided in the root directory:

```bash
docker build -t saboot-engine .
docker run -p 3001:3001 \
  -e EMAIL_PROVIDER=resend \
  -e RESEND_API_KEY="<your-key>" \
  -e EMAIL_FROM="onboarding@resend.dev" \
  -e CUSTOMER_PORTAL_BASE_URL="https://<public-domain>" \
  saboot-engine
```

---

## 📱 Live Mobile Phone Verification Checklist

Once deployed to your AWS public HTTPS endpoint:

1. **Admin Console**: Navigate to `https://<public-domain>/` from any browser or workstation.
2. **Delivery Submission**: Driver submits doorstep attempt evaluating to `REVIEW`.
3. **Live Resend Email**: Backend dispatches email with verification URL `https://<public-domain>/verify/DEL-ASR-01`.
4. **Mobile Inbox**: Customer opens verification email on mobile phone (4G/5G).
5. **Portal Handoff**: Tapping **Verify Delivery** opens `https://<public-domain>/verify/DEL-ASR-01`.
6. **Package Confirmation**:
   * Tap **📦 I RECEIVED THE PACKAGE** → Delivery automatically transitions to `VERIFIED`.
   * Tap **📦 I DID NOT RECEIVE THE PACKAGE** → Transitions to `CUSTOMER_CONFIRMED_FAILURE`, triggers `RETRY_REQUIRED`, driver app receives retry task, and admin console updates live via SSE.
