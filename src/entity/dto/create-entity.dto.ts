import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Entity } from '../entities/entity.entity';

export class CreateEntityDTO {
  @ApiProperty({ example: 'Leandro', description: 'Nombre' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Cepeda', description: 'Apellido' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'leandrojaviercepeda@gmail.com', description: 'Email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'leandrojaviercepeda', description: 'Nombre de usuario' })
  @IsNotEmpty()
  @IsString()
  userName: string;

  @ApiProperty({ example: 'secret', description: 'Contraseña' })
  @IsNotEmpty()
  @IsString()
  password: string;

  toEntity(): Entity {
    const user = new Entity();
    user.name = this.name;
    user.lastName = this.lastName;
    user.email = this.email;
    user.userName = this.userName;
    user.password = this.password;
    return user;
  }
}
