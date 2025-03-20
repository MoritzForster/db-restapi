FROM node
WORKDIR /production/db-restapi
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install 
COPY . .
EXPOSE 3306 4000
RUN chown -R node /production/db-restapi
USER node
CMD ["npm", "start"]