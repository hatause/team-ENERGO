#pragma once
#include <Arduino.h>
#include <stdint.h>

struct C2ESPpacket{
private:
    int id=0;
    int cabNum=0;
    bool isBusy=false;

public:
    int Id() const {return id;}
    int CabNum() const {return cabNum;}
    bool IsBusy() const {return isBusy;}

    void SetId(int newId) {id = newId;}
    void SetCabNum(int newCabNum) {cabNum = newCabNum;}
    void SetIsBusy(bool newIsBusy) {isBusy = newIsBusy;}
};
