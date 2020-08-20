# Create Elastic Container Repository for storing images
resource "aws_ecr_repository" "ng_container_repository" {
  name = "${var.application_name}"
}

resource "aws_security_group" "asteroid_game" {
  name = "${var.application_name}"
  ingress {
    from_port   = var.server_port
    to_port     = var.server_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${var.user_ip}/32"]
  }
  vpc_id = var.vpc_id
}

resource "aws_instance" "asteroid_game" {
  ami             = var.ami_id
  instance_type   = var.instance_type
  subnet_id       = var.subnet_id
  security_groups = [aws_security_group.asteroid_game.id]
  key_name        = var.key_pair
  tags = {
    application_name = "${var.application_name}"
  }

  //Allows ansible to ssh into the instance
  provisioner "remote-exec" {
    inline = ["echo 'Hello World'"]

    connection {
      host        = aws_instance.asteroid_game.public_ip
      type        = "ssh"
      user        = var.ssh_user
      private_key = file(var.private_key_path)
    }
  }

  provisioner "local-exec" {
    command = "ansible-playbook -i '${aws_instance.asteroid_game.public_ip},' --private-key ${var.private_key_path} ../ansible/setupService.yml"
  }
}