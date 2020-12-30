#!/bin/bash

docker run \
  -v `pwd`:/work \
  -e TZ=America/New_York \
  -e RPM_DT_APISECRET \
  -e RPM_DT_GCPKEYJSON \
  -e RPM_DT_BASEURL="https://rutherford-prime-meats.myshopify.com/admin/api/2020-10" \
  -e RPM_DT_BLOCKEDDAYS="2020-12-31,2021-1-1" \
  -e RPM_DT_MAXORDERS="20" \
  -e RPM_DT_WARNORDERS="15" \
  -e RPM_DT_SLEEPTIME="2m" \
  -e RPM_DT_EXITAFTER="25m" \
  --entrypoint=/work/delivery-throttle/scripts/run_docker.sh golang:1.15-buster
  
