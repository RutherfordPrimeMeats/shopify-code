#!/bin/bash

export RPM_DT_APISECRET=`cat /keybase/team/ruth_prime_meats/api-secret`
export RPM_DT_BASEURL="https://rutherford-prime-meats.myshopify.com/admin/api/2020-10"
export RPM_DT_BLOCKEDDAYS="2020-12-31,2021-1-1"
export RPM_DT_GCPKEYJSON=`cat /keybase/team/ruth_prime_meats/rutherford-prime-meats-07070.json`
export RPM_DT_MAXORDERS="20"
export RPM_DT_WARNORDERS="15"
export RPM_DT_SLEEPTIME="10s"
export RPM_DT_EXITAFTER="30s"
export RPM_DT_HEARTBEAT="1s"

go run .
