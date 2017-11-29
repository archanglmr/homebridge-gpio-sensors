"use strict";

var gpio = require('rpi-gpio');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-gpio-sensors", "GPIOSensors", GPIOSensors);
};



// setup global gpio object callbacks
gpio.channel_callbacks = {};
gpio.on('change', (channel, value) => {
  if (gpio.channel_callbacks[channel]) {
    gpio.channel_callbacks[channel](value);
  }
});


class GPIOSensors {
  constructor(log, config) {
    this.log = log;
    this.services = [];

    for (let name in config.sensors) {
      let sensorInfo = config.sensors[name],
          sensor = null;

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

      if (sensor) {
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

    if (this.name == undefined || pin == undefined) {
      throw "Specify name and pin in config file.";
    }

    //setup
    this._log = log;
    this.services = [service];

    this.log(`Pin ${pin}`);
    //this.services.push(this._createSwitch(pin, `${name} Pin ${pin}`, callback));

    // register our read/update function. do this before calling super() so that
    // initial value is recorded.
    gpio.channel_callbacks[pin] = callback;

    // setup this sensors gpio pin
    gpio.setup(pin, gpio.DIR_IN, gpio.EDGE_BOTH, () => {
      gpio.read(pin, (err, value) => {
        this.state = !!value;
        gpio.channel_callbacks[pin](this.state);
      });
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

  /**
   * Internal helper function to create a new "Switch" that is ties to the
   * status of this  Sensor.
   *
   * @param name
   * @returns {Service.Switch|*}
   * @private
   */
  //_createSwitch(pin, name, callback) {
  //  var sw;
  //
  //  this.log('Create Switch: ' + name);
  //  sw = new Service.Switch(name, pin);
  //  sw.setCharacteristic(Characteristic.On, false);
  //  sw.getCharacteristic(Characteristic.On).on('change', callback);
  //
  //  return sw;
  //}
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
        this.log(value.newValue);
        service.setCharacteristic(Characteristic.CarbonDioxideDetected,
            value.newValue ?
                Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL :
                Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
        );
      }
    });

    //service
    //    .getCharacteristic(Characteristic.CarbonDioxideDetected)
    //    .on('get', this.getState.bind(this));
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
        this.log(value.newValue);
        service.setCharacteristic(Characteristic.CarbonMonoxideDetected,
            value.newValue ?
                Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
                Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL
        );
      }
    });

    //service
    //    .getCharacteristic(Characteristic.CarbonMonoxideDetected)
    //    .on('get', this.getState.bind(this));
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
        this.log(value.newValue);
        service.setCharacteristic(Characteristic.ContactSensorState,
            value.newValue ?
                // This one feels backwards but a contact sensor's normal state must be not in contact?
                Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
                Characteristic.ContactSensorState.CONTACT_DETECTED);
      }
    });

    //service
    //    .getCharacteristic(Characteristic.ContactSensorState)
    //    .on('get', this.getState.bind(this));
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
        this.log(value.newValue);
        service.setCharacteristic(Characteristic.LeakDetected,
            value.newValue ?
                Characteristic.LeakDetected.LEAK_DETECTED :
                Characteristic.LeakDetected.LEAK_NOT_DETECTED
        );
      }
    });

    //service
    //    .getCharacteristic(Characteristic.LeakDetected)
    //    .on('get', this.getState.bind(this));
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
        this.log(value.newValue);
        service.setCharacteristic(Characteristic.MotionDetected, value.newValue);
      }
    });

    //service
    //    .getCharacteristic(Characteristic.MotionDetected)
    //    .on('get', this.getState.bind(this));
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
        this.log(value.newValue);
        service.setCharacteristic(Characteristic.OccupancyDetected,
            value.newValue ?
                Characteristic.OccupancyDetected.OCCUPANCY_DETECTED :
                Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
      }
    });

    //service
    //    .getCharacteristic(Characteristic.OccupancyDetected)
    //    .on('get', this.getState.bind(this));
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
        this.log(value.newValue);
        service.setCharacteristic(Characteristic.SmokeDetected,
            value.newValue ?
                Characteristic.SmokeDetected.SMOKE_DETECTED :
                Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
        );
      }
    });

    //service
    //    .getCharacteristic(Characteristic.SmokeDetected)
    //    .on('get', this.getState.bind(this));
  }
}