/* tslint:disable */
/* eslint-disable */
import * as thrift from "thrift";
import * as VariasLotacoesHeaderThrift from "./VariasLotacoesHeaderThrift";
import * as FichaAtendimentoDomiciliarChildThrift from "./FichaAtendimentoDomiciliarChildThrift";

export interface IFichaAtendimentoDomiciliarMasterThriftArgs {
    headerTransport: VariasLotacoesHeaderThrift.VariasLotacoesHeaderThrift;
    atendimentosDomiciliares?: Array<FichaAtendimentoDomiciliarChildThrift.FichaAtendimentoDomiciliarChildThrift>;
    uuidFicha?: string;
    tpCdsOrigem?: number;
}

export class FichaAtendimentoDomiciliarMasterThrift {
    public headerTransport: VariasLotacoesHeaderThrift.VariasLotacoesHeaderThrift;
    public atendimentosDomiciliares?: Array<FichaAtendimentoDomiciliarChildThrift.FichaAtendimentoDomiciliarChildThrift>;
    public uuidFicha?: string;
    public tpCdsOrigem?: number;

    constructor(args: IFichaAtendimentoDomiciliarMasterThriftArgs) {
        if (args != null && args.headerTransport != null) {
            this.headerTransport = args.headerTransport;
        }
        else {
            throw new thrift.Thrift.TProtocolException(thrift.Thrift.TProtocolExceptionType.UNKNOWN, "Required field[headerTransport] is unset!");
        }
        if (args != null && args.atendimentosDomiciliares != null) {
            this.atendimentosDomiciliares = args.atendimentosDomiciliares;
        }
        if (args != null && args.uuidFicha != null) {
            this.uuidFicha = args.uuidFicha;
        }
        if (args != null && args.tpCdsOrigem != null) {
            this.tpCdsOrigem = args.tpCdsOrigem;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("FichaAtendimentoDomiciliarMasterThrift");
        if (this.headerTransport != null) {
            output.writeFieldBegin("headerTransport", thrift.Thrift.Type.STRUCT, 1);
            this.headerTransport.write(output);
            output.writeFieldEnd();
        }
        if (this.atendimentosDomiciliares != null) {
            output.writeFieldBegin("atendimentosDomiciliares", thrift.Thrift.Type.LIST, 2);
            output.writeListBegin(thrift.Thrift.Type.STRUCT, this.atendimentosDomiciliares.length);
            this.atendimentosDomiciliares.forEach((value_1: FichaAtendimentoDomiciliarChildThrift.FichaAtendimentoDomiciliarChildThrift): void => {
                value_1.write(output);
            });
            output.writeListEnd();
            output.writeFieldEnd();
        }
        if (this.uuidFicha != null) {
            output.writeFieldBegin("uuidFicha", thrift.Thrift.Type.STRING, 3);
            output.writeString(this.uuidFicha);
            output.writeFieldEnd();
        }
        if (this.tpCdsOrigem != null) {
            output.writeFieldBegin("tpCdsOrigem", thrift.Thrift.Type.I32, 4);
            output.writeI32(this.tpCdsOrigem);
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
        return;
    }

    public static read(input: thrift.TProtocol): FichaAtendimentoDomiciliarMasterThrift {
        input.readStructBegin();
        let _args: any = {};
        while (true) {
            const ret: thrift.TField = input.readFieldBegin();
            const fieldType: thrift.Thrift.Type = ret.ftype;
            const fieldId: number = ret.fid;
            if (fieldType === thrift.Thrift.Type.STOP) {
                break;
            }
            switch (fieldId) {
                case 1:
                    if (fieldType === thrift.Thrift.Type.STRUCT) {
                        const value_2: VariasLotacoesHeaderThrift.VariasLotacoesHeaderThrift = VariasLotacoesHeaderThrift.VariasLotacoesHeaderThrift.read(input);
                        _args.headerTransport = value_2;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 2:
                    if (fieldType === thrift.Thrift.Type.LIST) {
                        const value_3: Array<FichaAtendimentoDomiciliarChildThrift.FichaAtendimentoDomiciliarChildThrift> = new Array<FichaAtendimentoDomiciliarChildThrift.FichaAtendimentoDomiciliarChildThrift>();
                        const metadata_1: thrift.TList = input.readListBegin();
                        const size_1: number = metadata_1.size;
                        for (let i_1: number = 0; i_1 < size_1; i_1++) {
                            const value_4: FichaAtendimentoDomiciliarChildThrift.FichaAtendimentoDomiciliarChildThrift = FichaAtendimentoDomiciliarChildThrift.FichaAtendimentoDomiciliarChildThrift.read(input);
                            value_3.push(value_4);
                        }
                        input.readListEnd();
                        _args.atendimentosDomiciliares = value_3;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 3:
                    if (fieldType === thrift.Thrift.Type.STRING) {
                        const value_5: string = input.readString();
                        _args.uuidFicha = value_5;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 4:
                    if (fieldType === thrift.Thrift.Type.I32) {
                        const value_6: number = input.readI32();
                        _args.tpCdsOrigem = value_6;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                default: {
                    input.skip(fieldType);
                }
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        if (_args.headerTransport !== undefined) {
            return new FichaAtendimentoDomiciliarMasterThrift(_args);
        }
        else {
            throw new thrift.Thrift.TProtocolException(thrift.Thrift.TProtocolExceptionType.UNKNOWN, "Unable to read FichaAtendimentoDomiciliarMasterThrift from input");
        }
    }
}
