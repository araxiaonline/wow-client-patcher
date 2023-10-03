import { EventEmitter } from 'events';

/**
 * Example Usage of custom emitter class
 *
 * type TestMap = {
 *     start: { total: number },
 *     end: { bytes: number },
 *     data: {bytes: number, total: number, percentage: number, file: string }
 * };
 *
 * const testEmitter = new MyEmitter<TestMap>();
 * testEmitter.on('start', (params) => {
 *     console.log('start', params);
 * });
 */

type EventMap = Record<string, any>;
type EventKey<T extends EventMap> = string & keyof T;
type EventReceiver<T> = (params: T) => void;

export default class Emitter<T extends EventMap> {
  private emitter = new EventEmitter();

  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.emitter.on(eventName, fn);
  }

  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.emitter.off(eventName, fn);
  }

  emit<K extends EventKey<T>>(eventName: K, params: T[K]) {
    this.emitter.emit(eventName, params);
  }

}


