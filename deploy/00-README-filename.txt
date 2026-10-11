# gh-web 的 nginx 站点配置
#
# 文件名必须保持 zz- 前缀：nginx 按 conf.d 目录字母序加载，第一个监听 80 的
# server 会顺带成为该端口的「默认服务器」。用 zz- 排在最后，才能把默认服务器
# 让给原有站点，使未知 Host 的行为与部署本服务之前完全一致。
#
# install.sh 会把本文件装到 /etc/nginx/conf.d/zz-gh-web.conf
