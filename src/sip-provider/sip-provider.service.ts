import { Injectable } from '@nestjs/common';
import { CreateSIPProviderDto, UpdateSIPProviderDto } from './dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { writeProviderToPJSIP } from 'src/utils/pjsip-writer';

@Injectable()
export class SipProviderService {
  constructor(private prisma: PrismaService) { }


  async create(data: CreateSIPProviderDto) {
    const { endpoint, auth, aor, identify, contact, ...providerData } = data;

    const sipProvider = await this.prisma.sIPProvider.create({
      data: {
        ...providerData,
      },
    });


    await this.prisma.sIPProviderConfig.create({
      data: {
        sipProviderId: sipProvider.id,
        endpoint: { ...endpoint },
        auth: { ...auth },
        aor: { ...aor },
        identify: { ...identify },
        contact: { ...contact },
      }
    });


    await writeProviderToPJSIP({
      endpoint,
      auth,
      aor,
      identify,
      contact,
    });

    return sipProvider;
  }


  findAll() {
    return this.prisma.sIPProvider.findMany({
      include: {
        _count: {
          select: {
            SystemCompany: true,
            RTPAddress: true
          }
        },
      }
    });
  }

  findOne(id: string) {
    return this.prisma.sIPProvider.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateSIPProviderDto) {
    return this.prisma.sIPProvider.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.sIPProvider.delete({ where: { id } });
  }
}

