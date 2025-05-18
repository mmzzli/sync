#!/bin/bash

# 提示用户输入私钥
echo -n "请输入私钥: "
read -s PRIVATE_KEY
echo

# 导出为环境变量并启动项目
export PRIVATE_KEY=$PRIVATE_KEY
export NODE_ENV=development
export PORT=3001
pm2 start npm --name constract-sync -- start