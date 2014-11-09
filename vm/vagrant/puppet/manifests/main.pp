class apt_update {
    exec { "aptGetUpdate":
        command => "sudo apt-get update",
        path => ["/bin", "/usr/bin"]
    }
}

class othertools {
    package { "git":
        ensure => latest,
        require => Exec["aptGetUpdate"]
    }

    package { "vim-common":
        ensure => latest,
        require => Exec["aptGetUpdate"]
    }

    package { "curl":
        ensure => present,
        require => Exec["aptGetUpdate"]
    }

    package { "htop":
        ensure => present,
        require => Exec["aptGetUpdate"]
    }

    package { "g++":
        ensure => present,
        require => Exec["aptGetUpdate"]
    }
}

class nodejs {
  exec { "git_clone_n":
    command => "git clone https://github.com/visionmedia/n.git /home/vagrant/n",
    path    => ["/bin", "/usr/bin"],
    require => [Exec["aptGetUpdate"], Package["git"], Package["curl"], Package["g++"]]
  }

  exec { "install_n":
    command => "make install",
    path    => ["/bin", "/usr/bin"],
    cwd     => "/home/vagrant/n",
    require => Exec["git_clone_n"]
  }

  exec { "install_node":
    command => "n stable",
    path    => ["/bin", "/usr/bin", "/usr/local/bin"],
    require => [Exec["git_clone_n"], Exec["install_n"]]
  }
}

class rabbitmq-server {
  class { "::rabbitmq":
    service_manage    => false,
    delete_guest_user => true,
    port              => "5672",
    admin_enable      => true,
    management_port   => 15672,
    ssl               => true,
    ssl_cacert        => "/etc/rabbitmq/ssl/cacert.pem",
    ssl_cert          => "/etc/rabbitmq/ssl/cert.pem",
    ssl_key           => "/etc/rabbitmq/ssl/key.pem",
  }

  rabbitmq_user { 'dev':
    admin    => true,
    password => 'rabbit',
  }

  rabbitmq_user { 'amqpjs':
    admin    => false,
    password => 'amqpjs',
  }

  rabbitmq_vhost { 'test':
    ensure  => present,
  }

  rabbitmq_user_permissions { 'amqpjs@test':
    configure_permission => '.*',
    read_permission      => '.*',
    write_permission     => '.*',
  }

  rabbitmq_plugin {'rabbitmq_management':
    ensure => present,
    require => Class["::rabbitmq"],
  }

  include 'erlang'
  package { 'erlang-base':
    ensure => 'latest',
  }

  exec { "restart-rabbitmq":
    command => "service rabbitmq-server restart",
    path    => ["/bin", "/usr/bin"],
    require => Class["::rabbitmq"],
  }
}

include apt_update
include othertools
include nodejs
include rabbitmq-server
