#!/bin/bash

# Load environment variables
source .env

# Function to run a command on the EC2 instance
run_remote() {
    ssh -i "$EC2_KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" "$1"
}

# Test SSH connection
echo "Testing SSH connection..."
if ! run_remote "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo "Error: Unable to establish SSH connection. Please check your EC2 instance and network."
    exit 1
fi

# Ensure remote directory exists
echo "Ensuring remote directory exists..."
run_remote "mkdir -p $REMOTE_PATH" > /dev/null 2>&1

# Copy files to EC2
echo "Copying files to EC2..."
if ! scp -i "$EC2_KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no -r "$PROJECT_PATH"/* "$EC2_USER@$EC2_HOST:$REMOTE_PATH" > /dev/null 2>&1; then
    echo "Error: File copy failed. Please check your paths and permissions."
    exit 1
fi

# Deploy on EC2
echo "Deploying on EC2..."
run_remote "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml down" > /dev/null 2>&1
run_remote "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml build" > /dev/null 2>&1
run_remote "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml up -d" > /dev/null 2>&1

echo "Deployment completed!"