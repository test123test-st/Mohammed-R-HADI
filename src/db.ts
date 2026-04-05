import Dexie, { type Table } from 'dexie';
import { Employee } from './types';

export class MyDatabase extends Dexie {
  employees!: Table<Employee>;

  constructor() {
    super('RadarDatabase');
    this.version(1).stores({
      employees: '++id, fullName, employeeId, station, certificate, residenceProvince' // primary key "id" (autoincremented)
    });
  }
}

export const db = new MyDatabase();
