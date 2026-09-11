FROM node:26-trixie-slim

ARG USER_NAME
ARG WORK_DIR
ARG ROOT_PATH="/home/${USER_NAME}"

WORKDIR ${WORK_DIR}

RUN apt-get update\
  && apt-get install -y curl git make

RUN npm install -g @vscode/vsce

CMD ["tail", "-f", "/dev/null"]