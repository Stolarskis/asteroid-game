# Create VPC / Security Groups

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "development-vpc"
  cidr = var.vpc_cidr

  azs             = var.azs
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway = true
  enable_vpn_gateway = true

  tags = {
    Terraform   = "true"
    Environment = "dev"
  }
}

resource "aws_security_group" "lb" {
  name   = "asteroid-game-lb"
  vpc_id = module.vpc.vpc_id
  # Allow all https traffic
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Setup Elastic ALB 

# Setup s3 for lb to store its logs in
data "aws_elb_service_account" "this" {}

data "aws_iam_policy_document" "logs" {
  statement {
    actions = [
      "s3:PutObject",
    ]

    principals {
      type        = "AWS"
      identifiers = [data.aws_elb_service_account.this.arn]
    }

    resources = [
      "arn:aws:s3:::asteroid-game-lb-logs/*",
    ]
  }
}

# resource "aws_s3_bucket" "asteroid_game_lb_logs" {
#   bucket = "asteroid-game-lb-logs"
#   acl    = "private"
#   policy = data.aws_iam_policy_document.logs.json
# Allows terraform to remove the bucket once its created
#   force_destroy = true

#   tags = {
#     Name        = "asteroid_game_lb_logs"
#     Environment = "Dev"
#   }
# }

data "aws_s3_bucket" "asteroid_game_lb_logs" {
  bucket = "asteroid-game-lb-logs"
}



# Setup lb

resource "aws_lb" "asteroid_game_lb" {
  name               = "asteroid-game-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb.id]
  # Lb needs two subnets in different AZs.
  # These two subnets "might" not be in two AZs
  subnets = [module.vpc.public_subnets[0], module.vpc.public_subnets[1]]

  enable_deletion_protection = false

  access_logs {
    bucket  = data.aws_s3_bucket.asteroid_game_lb_logs.id
    prefix  = "asteroid-game-lb-logs"
    enabled = true
  }

  tags = {
    Environment = "Dev"
  }
}



# Get Certificate 
data "aws_acm_certificate" "asteroid_game" {
  domain   = "asteroid-game.com"
  statuses = ["ISSUED"]
}

resource "aws_lb_listener" "asteroid_game_https" {
  load_balancer_arn = "${aws_lb.asteroid_game_lb.arn}"
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.asteroid_game.arn

  default_action {
    type             = "forward"
    target_group_arn = "${aws_lb_target_group.asteroid_game.arn}"
  }
}


# Http redirect
resource "aws_lb_listener" "asteroid_game_http" {
  load_balancer_arn = "${aws_lb.asteroid_game_lb.arn}"
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_target_group" "asteroid_game" {
  name     = "asteroid-game-lb-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  depends_on = [module.vpc]
}

resource "aws_lb_target_group_attachment" "asteroid_game" {
  target_group_arn = aws_lb_target_group.asteroid_game.arn
  target_id        = var.ec2_id
  port             = 80
}

data "aws_route53_zone" "asteroid_game_zone"{
  name             = var.route_zone_name
}

resource "aws_route53_record" "asteroid_game_record"{
  zone_id = data.aws_route53_zone.asteroid_game_zone.id
  name    = "asteroid-game-record"
  type    = "CNAME"
  ttl     = "5"

  records        = [aws_lb.asteroid_game_lb.dns_name]
}


