"""
速率限制中间件 — 防止恶意高频调用消耗 Token
使用 slowapi 实现基于 IP 的限流
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# 全局限流器
limiter = Limiter(key_func=get_remote_address, default_limits=["3/minute", "20/day"])
