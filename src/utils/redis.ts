import Redis from "ioredis";
import { redisConnection } from "../constants/redisConnection";

export const redisClient = new Redis(redisConnection);