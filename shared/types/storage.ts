export interface StorageHealth {
  device: string
  model: string
  serial: string
  firmware: string
  size: number
  temperature: number
  percentageUsed: number
  powerOnHours: number
  dataUnitsWritten: number
  dataUnitsRead: number
  mediaErrors: number
  unsafeShutdowns: number
  errorLogEntries: number
  availableSpare: number
  availableSpareThreshold: number
  criticalWarning: number
  partitions: DiskPartition[]
}

export interface DiskPartition {
  device: string
  mount: string
  filesystem: string
  size: number
  used: number
  percent: number
}
