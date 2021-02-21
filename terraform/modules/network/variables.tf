variable "user_ip" {
  type        = string
  description = "User's public ip to only allow ssh from that ip"
}

#variable "vpc_id"{
#  type = string
#}

variable "vpc_cidr" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "public_subnets" {
  type = list(string)
}

variable "azs" {
  type = list(string)
}

variable "ec2_id" {
  type = string
}

variable "route_zone_name"{
  default = "asteroid-game.com"
}
