🌐 S3 HTML Website 🧑‍💻
This repository contains the configuration for a static website hosted on AWS using S3, CloudFront, Route 53, and SSL certificates managed through AWS Certificate Manager.

🛠️ Architecture Overview
The architecture leverages the following AWS services:

Amazon S3: 🗃️ Used to store the static content of the website, including index.html and error.html files.
Amazon CloudFront: 🌍 A Content Delivery Network (CDN) to deliver the content globally with low latency.
Amazon Route 53: 🌐 DNS management to route traffic to the CloudFront distribution.
AWS Certificate Manager: 🔒 To manage SSL certificates for secure HTTPS access.
📋 Prerequisites
AWS account with permissions to manage S3, CloudFront, Route 53, and ACM.
A domain name for DNS management through Route 53.
A basic understanding of how AWS services work together.
🚀 Getting Started
Create an S3 Bucket 🗂️
Create an S3 bucket in your AWS account to store your static website files (index.html, error.html, etc.).

Make the bucket public or configure it for static website hosting.
Enable Static Website Hosting in the bucket properties and configure the index.html and error.html file names.
Configure CloudFront 📡
Set up a CloudFront distribution to serve your website through a CDN.

Origin Domain Name: Select your S3 bucket from the list of available sources.
Viewer Protocol Policy: Set to "Redirect HTTP to HTTPS" to ensure secure connections.
Cache Behavior: Choose the appropriate settings based on your needs (e.g., caching TTL, query string forwarding).
Set Up SSL Certificates via AWS Certificate Manager (ACM) 🔑
To serve your website over HTTPS, request an SSL certificate for your domain through AWS ACM.

Validate the domain ownership via DNS validation (Route 53 can automate this process).
Associate the SSL certificate with your CloudFront distribution.
Route 53 DNS Setup 🌍
Use Route 53 to configure your domain’s DNS to point to your CloudFront distribution.

Create an A record in Route 53, pointing to the CloudFront distribution’s DNS name.
Ensure that your domain is verified in ACM before updating DNS settings.
Test Your Setup ✅
After configuring these services, test your website by navigating to the domain you’ve configured. Your static content should be served securely via HTTPS with fast global delivery.

📂 File Structure
Here’s an example of the file structure for your S3 bucket:

go
Copy
/ (root)
  ├── index.html
  ├── error.html
🔗 Useful Links
AWS S3 Documentation 📖
AWS CloudFront Documentation 📄
AWS Route 53 Documentation 🌐
AWS Certificate Manager Documentation 🔐
⚠️ Troubleshooting
No Content Served via HTTPS: 🔒 Ensure that the CloudFront distribution is correctly associated with the SSL certificate in ACM and that you’re accessing your domain using HTTPS.
DNS Issues: 🌍 Make sure the A record in Route 53 is pointing to the correct CloudFront distribution.
Cache Issues: 🔄 If changes aren't appearing immediately, try invalidating the CloudFront cache.
🎉 Conclusion
This setup provides a simple and secure way to host a static website on AWS with global content delivery, SSL encryption, and custom domain routing. By combining S3, CloudFront, Route 53, and ACM, you can ensure both performance and security for your web application.
