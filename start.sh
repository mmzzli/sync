#!/bin/bash

# 提示用户输入私钥
echo -n "请输入私钥: "
read -s PRIVATE_KEY
echo

# 导出为环境变量
export PRIVATE_KEY=$PRIVATE_KEY
export NODE_ENV=development
export PORT=3001

# 使用 PM2 启动，添加内存限制和优雅退出配置
pm2 start npm --name constract-sync \
  --node-args="--max-old-space-size=2048 --expose-gc" \
  --max-memory-restart 1.5G \
  --kill-timeout 10000 \        # 给应用10秒的优雅退出时间
  --listen-timeout 10000 \      # 等待10秒让应用完全启动
  --wait-ready \                # 等待应用发送ready信号
  --exp-backoff-restart-delay=100 \  # 重启延迟
  -- start

# 显示运行状态
echo "应用已启动，查看日志请运行: pm2 logs constract-sync"