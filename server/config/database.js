import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let memoryServer

export async function connectDatabase() {
  const uri = process.env.MONGO_URI?.trim()

  if (!uri) {
    memoryServer = await MongoMemoryServer.create()
    await mongoose.connect(memoryServer.getUri())
    console.warn(
      'MONGO_URI is empty; using mongodb-memory-server. Database data is temporary and will be lost when the server stops.',
    )
    return
  }

  await mongoose.connect(uri)
  console.info('Connected to MongoDB.')
}

export async function stopDatabase() {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
}
