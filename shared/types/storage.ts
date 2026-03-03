// Storage health status
export interface StorageHealth {
  percentageUsed: number  // 0-100
  temperature: number  // Celsius
  powerOnHours: number
  dataUnitsWritten: number  // In 512KB units
  dataUnitsRead: number  // In 512KB units
  criticalWarning: number
  availableSpare: number
  availableSpareThreshold: number
  mediaErrors: number
  unsafeShutdowns: number
  errorLogEntries: number
}

// Disk partition
export interface Partition {
  mount: string
  filesystem: string
  size: number
  used: number
  free: number
  percent: number
}

// Storage status
export interface StorageStatus {
  health: StorageHealth | null
  partitions: Partition[]
  model: string
  serial: string
  firmware: string
  interface: string
  capacity: number
}
