# Homebridge GPIO Sensors Plugin


## How to install

 ```sudo npm install -g homebridge-gpio-sensors```

On your sensor hook one wire to the Pi ground and the other to the GPIO pin you want to use.

Warning: I've only tested this with push buttons on a breadboard. Maybe I need to switch it so you hook one wire to power and the other to the GPIO?
 

## Example config.json:

Use the physical pin number on the Pi.

 ```
    "accessories": [
    {
      "accessory": "GPIOSensors",
      "name": "Detector",
      "sensors": [
        {
          "name": "Default Room Carbon Dioxide",
          "type": "CarbonDioxide",
          "pin": 21
        },
        {
          "name": "Default Room Carbon Monoxide",
          "type": "CarbonMonoxide",
          "pin": 22
        },
        {
          "name": "Default Room Contact",
          "type": "Contact",
          "pin": 23
        },
        {
          "name": "Default Room Leak",
          "type": "Leak",
          "pin": 24
        },
        {
          "name": "Default Room Motion",
          "type": "Motion",
          "pin": 26
        },
        {
          "name": "Default Room Occupancy",
          "type": "Occupancy",
          "pin": 27
        },
        {
          "name": "Default Room Smoke",
          "type": "Smoke",
          "pin": 28
        }
      ]
    }
``` 