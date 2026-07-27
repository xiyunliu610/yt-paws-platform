import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreatePetInput {
  name: string;
  species?: string;
  breed?: string;
  age?: number;
  weight?: number;
  personality?: string;
  dietNotes?: string;
  isNeutered?: boolean;
  photoUrl?: string;
}

interface UpdatePetInput extends Partial<CreatePetInput> {}

interface CreateHealthRecordInput {
  type: string;
  date: string;
  nextDate?: string;
  notes?: string;
}

@Injectable()
export class PetsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, data: CreatePetInput) {
    if (!data.name?.trim()) {
      throw new BadRequestException('Pet name is required');
    }

    return this.prisma.pet.create({ data: { ...data, ownerId } });
  }

  async findAllForOwner(ownerId: string) {
    return this.prisma.pet.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Loads a pet and enforces that it belongs to the requesting user (US-02.2).
  async findOneForOwner(ownerId: string, petId: string) {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }
    if (pet.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this pet');
    }
    return pet;
  }

  async update(ownerId: string, petId: string, data: UpdatePetInput) {
    await this.findOneForOwner(ownerId, petId);
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestException('Pet name cannot be empty');
    }
    return this.prisma.pet.update({ where: { id: petId }, data });
  }

  async addHealthRecord(ownerId: string, petId: string, data: CreateHealthRecordInput) {
    await this.findOneForOwner(ownerId, petId);
    if (!data.type?.trim() || !data.date) {
      throw new BadRequestException('Record type and date are required');
    }
    return this.prisma.petHealthRecord.create({
      data: {
        petId,
        type: data.type,
        date: new Date(data.date),
        nextDate: data.nextDate ? new Date(data.nextDate) : undefined,
        notes: data.notes,
      },
    });
  }

  async listHealthRecords(ownerId: string, petId: string) {
    await this.findOneForOwner(ownerId, petId);
    return this.prisma.petHealthRecord.findMany({
      where: { petId },
      orderBy: { date: 'desc' },
    });
  }
}
