"use strict";

var rpio = require('rpio');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-gpio-sensors", "GPIOSensors", GPIOSensors);
};



// setup global gpio object callbacks
rpio.channel_callbacks = {};


class GPIOSensors {
  constructor(log, config) {
    this.log = log;
    this.services = [];

    for (let i = 0, c = config.sensors.length; i < c; i += 1) {
      let sensorInfo = config.sensors[i],
          sensor = null;
      if (!sensorInfo.pin) {  continue; }

      log(`Creating ${sensorInfo.type} on pin ${sensorInfo.pin}`);
      switch(sensorInfo.type.toUpperCase()) {
        case 'C0':
        case 'CARBONMONOXIDE':
          sensor = new CarbonMonoxideSensor(sensorInfo.name, sensorInfo.pin, this.log);
          break;

        case 'C02':
        case 'CARBONDIOXIDE':
          sensor = new CarbonDioxideSensor(sensorInfo.name, sensorInfo.pin, this.log);
          break;

        case 'CONTACT':
          sensor = new ContactSensor(sensorInfo.name, sensorInfo.pin, this.log);
          break;

        case 'LEAK':
          sensor = new LeakSensor(sensorInfo.name, sensorInfo.pin, this.log);
          break;

        case 'MOTION':
          sensor = new MotionSensor(sensorInfo.name, sensorInfo.pin, this.log);
          break;

        case 'OCCUPANCY':
          sensor = new OccupancySensor(sensorInfo.name, sensorInfo.pin, this.log);
          break;

        case 'SMOKE':
          sensor = new SmokeSensor(sensorInfo.name, sensorInfo.pin, this.log);
          break;

        default: break;
      }

      log('Sensor complete');
      if (sensor) {
        sensor.updateState(); // needed for initial state setting
        this.services = [...this.services, ...sensor.services];
      }
    }
  }

  /**
   * Homebridge function to return all the Services associated with this
   * Accessory.
   *
   * @returns {*[]}
   */
  getServices() {
    var informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'github.com/archanglmr')
        .setCharacteristic(Characteristic.Model, '0.1')
        .setCharacteristic(Characteristic.SerialNumber, '20171021');


    return [informationService, ...this.services]
  }
}








class Sensor {
  constructor({name, pin, log, service, callback}) {
    this.state = false;
    this.name = name;
    this.pin = pin;
    this.setStateCallback = callback;

    if (this.name == undefined || this.pin == undefined) {
      throw "Specify name and pin in config file.";
    }

    //setup
    this._log = log;
    this.services = [service];

    this.log(`Pin ${this.pin}`);

    rpio.channel_callbacks[this.pin] = this.setStateCallback;

    // setup this sensors gpio pin
    rpio.open(this.pin, rpio.INPUT, rpio.PULL_UP);
    this.state = !!rpio.read(this.pin);
    rpio.poll(this.pin, (pin) => {
      var state = !!rpio.read(this.pin);

      if (state != this.state) {
        this.log(`State changed from ${this.state} to ${state}`);
        this.state = state;
        rpio.channel_callbacks[this.pin](this.state);
      }
    });
  }

  log(message) {
    this._log(`${this.constructor.name} "${this.name}": ${message}`);
  }

  getState(cb) {
    this.log('getState', this.state);
    cb(null, this.state);
  }

  getServices() {
    return this.services;
  }

  updateState() {
    if (this.setStateCallback) {
      this.setStateCallback(this.state);
    }
  }
}








class CarbonDioxideSensor extends Sensor {
  constructor(name, pin, log) {
    var service = new Service.CarbonDioxideSensor(name);

    super({
      name,
      pin,
      log,
      service,
      callback: (value) => {
        this.log(value);
        service.setCharacteristic(Characteristic.CarbonDioxideDetected,
            value ?
                Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL :
                Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
        );
      }
    });

    service
        .getCharacteristic(Characteristic.CarbonDioxideDetected)
        .on('get', this.getState.bind(this));
  }
}

class CarbonMonoxideSensor extends Sensor {
  constructor(name, pin, log) {
    var service = new Service.CarbonMonoxideSensor(name);

    super({
      name,
      pin,
      log,
      service,
      callback: (value) => {
        this.log(value);
        service.setCharacteristic(Characteristic.CarbonMonoxideDetected,
            value ?
                Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
                Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL
        );
      }
    });

    service
        .getCharacteristic(Characteristic.CarbonMonoxideDetected)
        .on('get', this.getState.bind(this));
  }
}

class ContactSensor extends Sensor {
  constructor(name, pin, log) {
    var service = new Service.ContactSensor(name);

    super({
      name,
      pin,
      log,
      service,
      callback: (value) => {
        this.log(value);
        service.setCharacteristic(Characteristic.ContactSensorState,
            value ?
                // This one feels backwards but a contact sensor's normal state must be not in contact?
                Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
                Characteristic.ContactSensorState.CONTACT_DETECTED);
      }
    });

    service
        .getCharacteristic(Characteristic.ContactSensorState)
        .on('get', this.getState.bind(this));
  }
}

class LeakSensor extends Sensor {
  constructor(name, pin, log) {
    var service = new Service.LeakSensor(name);

    super({
      name,
      pin,
      log,
      service,
      callback: (value) => {
        this.log(value);
        service.setCharacteristic(Characteristic.LeakDetected,
            value ?
                Characteristic.LeakDetected.LEAK_DETECTED :
                Characteristic.LeakDetected.LEAK_NOT_DETECTED
        );
      }
    });

    service
        .getCharacteristic(Characteristic.LeakDetected)
        .on('get', this.getState.bind(this));
  }
}

class MotionSensor extends Sensor {
  constructor(name, pin, log) {
    var service = new Service.MotionSensor(name);

    super({
      name,
      pin,
      log,
      service,
      callback: (value) => {
        this.log(value);
        service.setCharacteristic(Characteristic.MotionDetected, value);
      }
    });

    service
        .getCharacteristic(Characteristic.MotionDetected)
        .on('get', this.getState.bind(this));
  }
}

class OccupancySensor extends Sensor {
  constructor(name, pin, log) {
    var service = new Service.OccupancySensor(name);

    super({
      name,
      pin,
      log,
      service,
      callback: (value) => {
        this.log(value);
        service.setCharacteristic(Characteristic.OccupancyDetected,
            value ?
                Characteristic.OccupancyDetected.OCCUPANCY_DETECTED :
                Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
      }
    });

    service
        .getCharacteristic(Characteristic.OccupancyDetected)
        .on('get', this.getState.bind(this));
  }
}

class SmokeSensor extends Sensor {
  constructor(name, pin, log) {
    var service = new Service.SmokeSensor(name);

    super({
      name,
      pin,
      log,
      service,
      callback: (value) => {
        this.log(value);
        service.setCharacteristic(Characteristic.SmokeDetected,
            value ?
                Characteristic.SmokeDetected.SMOKE_DETECTED :
                Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
        );
      }
    });

    service
        .getCharacteristic(Characteristic.SmokeDetected)
        .on('get', this.getState.bind(this));
  }
}
