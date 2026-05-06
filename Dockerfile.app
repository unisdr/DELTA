# Use the official Node.js 22 image as the base
FROM node:22-bookworm-slim

# Set the working directory to /delta
WORKDIR /delta

# Expose the port that the application will use
EXPOSE 3000

# Set the environment variables (development-only image)
ENV NODE_ENV=development
ENV PORT=3000

# Run the command to start the application using Yarn
CMD ["sh", "-c", "HUSKY=0 yarn install --frozen-lockfile && yarn dbsync && yarn react-router dev --host 0.0.0.0 --port ${PORT:-3000}"]