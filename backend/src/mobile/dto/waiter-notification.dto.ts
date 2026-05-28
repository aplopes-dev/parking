import { IsIn } from 'class-validator';
import { WaiterNotificationStatus } from '../entities/waiter-notification.entity';

export class UpdateWaiterNotificationDto {
  @IsIn([WaiterNotificationStatus.READ, WaiterNotificationStatus.DELIVERED])
  status: WaiterNotificationStatus.READ | WaiterNotificationStatus.DELIVERED;
}
