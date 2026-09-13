---
title: Secure AWS Terraform Configurations
impact: HIGH
impactDescription: Cloud misconfigurations and data exposure
tags: security, terraform, aws, infrastructure, iac, s3, iam, ec2
---

## Secure AWS Terraform Configurations

Security best practices for AWS Terraform configurations to prevent common misconfigurations.

### S3 Encryption

**Insecure (bucket without server-side encryption):**
```hcl
resource "aws_s3_bucket" "bucket" {
  bucket = "my-bucket"
}
```

**Secure (bucket-level KMS encryption via `aws_s3_bucket_server_side_encryption_configuration`):**
```hcl
resource "aws_s3_bucket" "bucket" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pass" {
  bucket = aws_s3_bucket.bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.example.arn
    }
    bucket_key_enabled = true
  }
}
```

> **Note:** `aws_s3_bucket_object` is deprecated in AWS provider 4+. Use `aws_s3_object` for individual objects, and configure encryption at the bucket level with `aws_s3_bucket_server_side_encryption_configuration` so all objects inherit it automatically.

### IAM Overly Permissive Policies

**Insecure (wildcard admin):**
```hcl
resource "aws_iam_policy" "fail" {
  policy = <<POLICY
{"Version":"2012-10-17","Statement":[{"Action":"*","Effect":"Allow","Resource":"*"}]}
POLICY
}
```

**Secure (least privilege):**
```hcl
resource "aws_iam_policy" "pass" {
  policy = <<POLICY
{"Version":"2012-10-17","Statement":[{"Action":["s3:GetObject*"],"Effect":"Allow","Resource":"arn:aws:s3:::bucket/*"}]}
POLICY
}
```

**Insecure (wildcard AssumeRole):**
```hcl
resource "aws_iam_role" "fail" {
  assume_role_policy = <<POLICY
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"*"},"Action":"sts:AssumeRole"}]}
POLICY
}
```

**Secure (restricted AssumeRole):**
```hcl
resource "aws_iam_role" "pass" {
  assume_role_policy = <<POLICY
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::123456789012:root"},"Action":"sts:AssumeRole"}]}
POLICY
}
```

### Unencrypted Storage

**Insecure (EBS):**
```hcl
resource "aws_ebs_volume" "fail" {
  availability_zone = "us-west-2a"
  encrypted         = false
}
```

**Secure (EBS):**
```hcl
resource "aws_ebs_volume" "pass" {
  availability_zone = "us-west-2a"
  encrypted         = true
}
```

**Insecure (RDS no backup):**
```hcl
resource "aws_db_instance" "fail" { backup_retention_period = 0 }
```

**Secure (RDS with backup):**
```hcl
resource "aws_db_instance" "pass" { backup_retention_period = 35 }
```

**Insecure (DynamoDB):**
```hcl
resource "aws_dynamodb_table" "fail" {
  name = "Table"; hash_key = "Id"
  attribute { name = "Id"; type = "S" }
}
```

**Secure (DynamoDB with CMK):**
```hcl
resource "aws_dynamodb_table" "pass" {
  name = "Table"; hash_key = "Id"
  attribute { name = "Id"; type = "S" }
  server_side_encryption { enabled = true; kms_key_arn = "arn:aws:kms:..." }
}
```

**Insecure (SQS/SNS):**
```hcl
resource "aws_sqs_queue" "fail" { name = "queue" }
resource "aws_sns_topic" "fail" {}
```

**Secure (SQS/SNS encrypted):**
```hcl
resource "aws_sqs_queue" "pass" { name = "queue"; sqs_managed_sse_enabled = true }
resource "aws_sns_topic" "pass" { kms_master_key_id = "alias/aws/sns" }
```

### Network Security

**Insecure (public SSH):**
```hcl
resource "aws_security_group_rule" "fail" {
  type = "ingress"; protocol = "tcp"; from_port = 22; to_port = 22
  cidr_blocks = ["0.0.0.0/0"]
}
```

**Secure (restricted CIDR):**
```hcl
resource "aws_security_group_rule" "pass" {
  type = "ingress"; protocol = "tcp"; from_port = 22; to_port = 22
  cidr_blocks = ["10.0.0.0/8"]
}
```

**Insecure (public IP):**
```hcl
resource "aws_instance" "fail" {
  ami = "ami-12345"; instance_type = "t3.micro"
  associate_public_ip_address = true
}
```

**Secure (no public IP):**
```hcl
resource "aws_instance" "pass" {
  ami = "ami-12345"; instance_type = "t3.micro"
  associate_public_ip_address = false
}
```

### Key Management

**Insecure (KMS no rotation):**
```hcl
resource "aws_kms_key" "fail" { enable_key_rotation = false }
```

**Secure (KMS with rotation):**
```hcl
resource "aws_kms_key" "pass" { enable_key_rotation = true }
```

**Insecure (CloudTrail):**
```hcl
resource "aws_cloudtrail" "fail" { name = "trail"; s3_bucket_name = "bucket" }
```

**Secure (CloudTrail encrypted):**
```hcl
resource "aws_cloudtrail" "pass" {
  name = "trail"; s3_bucket_name = "bucket"; kms_key_id = aws_kms_key.key.arn
}
```

### Credentials

**Insecure (hardcoded):**
```hcl
provider "aws" {
  region = "us-west-2"; access_key = "AKIAEXAMPLE"; secret_key = "secret"
}
```

**Secure (external credentials):**
```hcl
provider "aws" {
  region = "us-west-2"; shared_credentials_file = "~/.aws/creds"; profile = "myprofile"
}
```
