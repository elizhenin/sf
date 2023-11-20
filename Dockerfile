FROM node:18
# Create app directory
WORKDIR /<path-to-install-dir>
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD [ "npm", "run","start" ]
