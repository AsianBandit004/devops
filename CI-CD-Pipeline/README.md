## Jenkins Integration With Local Gitea Server and Ubuntu (HTML Website)

Hey everyone in this project I show the steps I used to integrate my local Jenkins Server w/ my Ansible and Gitea server.
Doing so allows me to run CI/CD pipelines to test playbooks and then they are pushed if it runs successfully via a git push 
to my internal Gitea server or a commit to my Gitea server!

## Step 1:

Ensure you have installed Jenkins on your local computer via Proxmox or any other Virtual environment:
I have mine installed as an LXC container on Proxmox using (https://tteck.github.io/Proxmox/) when you install it via the Shell for the host you should see something similar.
Like the below image:

<img width="144" alt="Screenshot 2025-01-25 at 1 37 40 PM" src="https://github.com/user-attachments/assets/ed3ec8d4-7e14-4a32-8bd4-464867323881" />

## Step 2:

After that go into the cmd line of the LXC container and run these commands:
~~~
docker run -it -p 8080:8080 jenkins/jenkins:lts)
~~~
~~~
docker ps
~~~
You will then see the container running on your docker instance:
<img width="638" alt="Screenshot 2025-01-25 at 1 38 13 PM" src="https://github.com/user-attachments/assets/d44bc052-b38e-4be0-9d75-d503814a11d3" />

## Step 3:

From here you can access your Jenkins Instance using the IP of the docker server followed by the port number.
The port number I have for mine is 32771

## Step 4:

Once you have logged into Jenkins and set it up you need to install some plugins:

<img width="881" alt="Screenshot 2025-01-25 at 7 26 48 PM" src="https://github.com/user-attachments/assets/a3f5dafc-658d-4631-9bb4-e9066117f065" />

<img width="333" alt="Screenshot 2025-01-25 at 7 27 08 PM" src="https://github.com/user-attachments/assets/e89476c4-d9b9-47cc-bead-2db0af09c5ac" />

From here you need to integrate your Gitea server with your Jenkins server
Great tutorials on how to do so here from CloudBeesTV: https://www.youtube.com/watch?v=NO3sZWRxgQM&t=333s&pp=ygUWbGluayBnaXRlYSBhbmQgamVua2lucw%3D%3D

## Step 5:

Once you get everything integrated its time to make our playbook and Jenkinsfile. You can find the Jenkinsfile I used and my playbook at the top.
If all goes well you should see a green check mark showing that your job completed successfuly whenever you commit or change anything in Gitea!
