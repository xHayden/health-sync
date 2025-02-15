-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "endTimestamp" TIMESTAMP(3),
    "duration" INTEGER NOT NULL,
    "energyBurned" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "type" TEXT NOT NULL,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthDataPoint" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "userId" INTEGER,
    "workoutId" INTEGER,

    CONSTRAINT "HealthDataPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessMetric" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "TTS" DOUBLE PRECISION NOT NULL,
    "ATL" DOUBLE PRECISION NOT NULL,
    "CTL" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FitnessMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workout_userId_timestamp_key" ON "Workout"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "HealthDataPoint_userId_category_idx" ON "HealthDataPoint"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "HealthDataPoint_userId_timestamp_category_key" ON "HealthDataPoint"("userId", "timestamp", "category");

-- CreateIndex
CREATE UNIQUE INDEX "FitnessMetric_userId_date_key" ON "FitnessMetric"("userId", "date");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthDataPoint" ADD CONSTRAINT "HealthDataPoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthDataPoint" ADD CONSTRAINT "HealthDataPoint_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessMetric" ADD CONSTRAINT "FitnessMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
