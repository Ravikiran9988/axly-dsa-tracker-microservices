import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

export class RabbitMQClient {
  private static instance: RabbitMQClient;
  private connection: any = null;
  private channel: any = null;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): RabbitMQClient {
    if (!RabbitMQClient.instance) {
      RabbitMQClient.instance = new RabbitMQClient();
    }
    return RabbitMQClient.instance;
  }

  public async connect(url: string): Promise<void> {
    if (this.connection || this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      // Setup Dead Letter Exchange
      await this.channel.assertExchange('dlx', 'direct', { durable: true });
      await this.channel.assertQueue('dlq', { durable: true });
      await this.channel.bindQueue('dlq', 'dlx', 'dead_letter');

      console.log('✅ Connected to RabbitMQ');
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public async publish(exchange: string, routingKey: string, message: any, correlationId?: string): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    
    const buffer = Buffer.from(JSON.stringify(message));
    this.channel.publish(exchange, routingKey, buffer, {
      persistent: true,
      correlationId: correlationId || uuidv4(),
      timestamp: Date.now(),
    });
  }

  public async consume(
    queueName: string, 
    exchange: string, 
    routingKey: string, 
    onMessage: (msg: any, correlationId: string) => Promise<void>
  ): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    
    // Create queue with DLQ routing
    const q = await this.channel.assertQueue(queueName, { 
      durable: true,
      deadLetterExchange: 'dlx',
      deadLetterRoutingKey: 'dead_letter' 
    });

    await this.channel.bindQueue(q.queue, exchange, routingKey);

    this.channel.consume(q.queue, async (msg: amqp.ConsumeMessage | null) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          const correlationId = msg.properties.correlationId;
          
          await onMessage(content, correlationId);
          
          this.channel!.ack(msg);
        } catch (error) {
          console.error(`Error processing message in ${queueName}, nacking...`, error);
          // nack with requeue = false pushes it to DLQ
          this.channel!.nack(msg, false, false);
        }
      }
    });
  }

  public async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log('RabbitMQ connection closed.');
  }
}
