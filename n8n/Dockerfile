FROM n8nio/n8n:latest

USER root
COPY parse_db.js /home/node/parse_db.js
COPY entrypoint.sh /entrypoint.sh
COPY Dignova_Sentient_Master_Unified.json /home/node/Dignova_Sentient_Master_Unified.json

RUN chmod +x /entrypoint.sh && \
    chown -R node:node /home/node /entrypoint.sh

USER node
EXPOSE 5678
ENTRYPOINT ["/entrypoint.sh"]
