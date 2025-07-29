import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSIPProviderDto, UpdateSIPProviderDto } from './dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { replaceProviderInPJSIPFile, writeProviderToPJSIP } from 'src/utils/pjsip-writer';

@Injectable()
export class SipProviderService {
  constructor(private prisma: PrismaService) { }


  async create(data: CreateSIPProviderDto) {
    const { endpoint, auth, aor, identify, contact, ...providerData } = data;

    const sipProvider = await this.prisma.sIPProvider.create({
      data: {
        ...providerData,
        SipTech: data.sipTech
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



  async update(id: string, data: UpdateSIPProviderDto) {
    const { endpoint, auth, aor, identify, contact, sipTech, ...providerData } = data;

    const updatedProvider = await this.prisma.sIPProvider.update({
      where: { id },
      data: {
        ...providerData,
        SipTech: data.sipTech,
      },
    });

    // Then, update or create the configuration record

    await this.prisma.sIPProviderConfig.upsert({
      where: { sipProviderId: id },
      update: {
        endpoint: endpoint?.config ?? {},
        auth: auth?.config ?? {},
        aor: aor?.config ?? {},
        identify: identify?.config ?? {},
        contact: contact?.config ?? {},
      },
      create: {
        sipProviderId: id,
        endpoint: endpoint?.config ?? {},
        auth: auth?.config ?? {},
        aor: aor?.config ?? {},
        identify: identify?.config ?? {},
        contact: contact?.config ?? {},
      }
    });


    // 💾 Update the config file by replacing the existing sections

    await replaceProviderInPJSIPFile(id, {
      endpoint: endpoint!,
      auth: auth!,
      aor: aor!,
      identify: identify!,
      contact: contact!,
    });


    return updatedProvider;
  }
  remove(id: string) {
    return this.prisma.sIPProvider.delete({ where: { id } });
  }
}

