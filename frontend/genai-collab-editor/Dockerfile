# Use Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy app code
COPY . .
RUN ls -ltr


# Build the production React app
RUN npm run build

# Install serve
RUN npm install -g serve

# Expose React port
EXPOSE 3000

# ✅ Serve with client-side routing support
CMD ["serve", "-s", "build", "--single", "-l", "3000"]
# CMD ["npm", "start"]
