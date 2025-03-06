export interface UserResponseDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  role: { name: string };
}
