/* tslint:disable */
/* eslint-disable */
import Int64 = require("node-int64");
import * as thrift from "thrift";

export interface IIvcfThriftArgs {
    resultado?: number | Int64;
    hasSgIdade?: boolean;
    hasSgPercepcaoSaude?: boolean;
    hasSgAvdInstrumental?: boolean;
    hasSgAvdBasica?: boolean;
    hasSgCognicao?: boolean;
    hasSgHumor?: boolean;
    hasSgAlcancePreensaoPinca?: boolean;
    hasSgCapAerobicaMuscular?: boolean;
    hasSgMarcha?: boolean;
    hasSgContinencia?: boolean;
    hasSgVisao?: boolean;
    hasSgAudicao?: boolean;
    hasSgComorbidade?: boolean;
    dataResultado?: number | Int64;
}

export class IvcfThrift {
    public resultado?: Int64;
    public hasSgIdade?: boolean;
    public hasSgPercepcaoSaude?: boolean;
    public hasSgAvdInstrumental?: boolean;
    public hasSgAvdBasica?: boolean;
    public hasSgCognicao?: boolean;
    public hasSgHumor?: boolean;
    public hasSgAlcancePreensaoPinca?: boolean;
    public hasSgCapAerobicaMuscular?: boolean;
    public hasSgMarcha?: boolean;
    public hasSgContinencia?: boolean;
    public hasSgVisao?: boolean;
    public hasSgAudicao?: boolean;
    public hasSgComorbidade?: boolean;
    public dataResultado?: Int64;

    constructor(args?: IIvcfThriftArgs) {
        if (args != null) {
            if (args.resultado != null) this.resultado = typeof args.resultado === 'number' ? new Int64(args.resultado) : args.resultado;
            if (args.hasSgIdade != null) this.hasSgIdade = args.hasSgIdade;
            if (args.hasSgPercepcaoSaude != null) this.hasSgPercepcaoSaude = args.hasSgPercepcaoSaude;
            if (args.hasSgAvdInstrumental != null) this.hasSgAvdInstrumental = args.hasSgAvdInstrumental;
            if (args.hasSgAvdBasica != null) this.hasSgAvdBasica = args.hasSgAvdBasica;
            if (args.hasSgCognicao != null) this.hasSgCognicao = args.hasSgCognicao;
            if (args.hasSgHumor != null) this.hasSgHumor = args.hasSgHumor;
            if (args.hasSgAlcancePreensaoPinca != null) this.hasSgAlcancePreensaoPinca = args.hasSgAlcancePreensaoPinca;
            if (args.hasSgCapAerobicaMuscular != null) this.hasSgCapAerobicaMuscular = args.hasSgCapAerobicaMuscular;
            if (args.hasSgMarcha != null) this.hasSgMarcha = args.hasSgMarcha;
            if (args.hasSgContinencia != null) this.hasSgContinencia = args.hasSgContinencia;
            if (args.hasSgVisao != null) this.hasSgVisao = args.hasSgVisao;
            if (args.hasSgAudicao != null) this.hasSgAudicao = args.hasSgAudicao;
            if (args.hasSgComorbidade != null) this.hasSgComorbidade = args.hasSgComorbidade;
            if (args.dataResultado != null) this.dataResultado = typeof args.dataResultado === 'number' ? new Int64(args.dataResultado) : args.dataResultado;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("IvcfThrift");
        if (this.resultado != null) {
            output.writeFieldBegin("resultado", thrift.Thrift.Type.I32, 1); // Dictionary says "resultado" (Int). Usually I32 for score.
            output.writeI32(typeof this.resultado === 'number' ? this.resultado : this.resultado.toNumber()); // Safe cast just in case
            output.writeFieldEnd();
        }
        // Flags 2-14
        const flags = [
            { id: 2, val: this.hasSgIdade },
            { id: 3, val: this.hasSgPercepcaoSaude },
            { id: 4, val: this.hasSgAvdInstrumental },
            { id: 5, val: this.hasSgAvdBasica },
            { id: 6, val: this.hasSgCognicao },
            { id: 7, val: this.hasSgHumor },
            { id: 8, val: this.hasSgAlcancePreensaoPinca },
            { id: 9, val: this.hasSgCapAerobicaMuscular },
            { id: 10, val: this.hasSgMarcha },
            { id: 11, val: this.hasSgContinencia },
            { id: 12, val: this.hasSgVisao },
            { id: 13, val: this.hasSgAudicao },
            { id: 14, val: this.hasSgComorbidade }
        ];
        flags.forEach(f => {
            if (f.val != null) {
                output.writeFieldBegin(`flag${f.id}`, thrift.Thrift.Type.BOOL, f.id);
                output.writeBool(f.val);
                output.writeFieldEnd();
            }
        });

        if (this.dataResultado != null) {
            output.writeFieldBegin("dataResultado", thrift.Thrift.Type.I64, 15);
            output.writeI64(this.dataResultado);
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
    }

    public static read(input: thrift.TProtocol): IvcfThrift {
        input.readStructBegin();
        let _args: any = {};
        while (true) {
            const ret: thrift.TField = input.readFieldBegin();
            const fieldType: thrift.Thrift.Type = ret.ftype;
            const fieldId: number = ret.fid;
            if (fieldType === thrift.Thrift.Type.STOP) break;
            switch (fieldId) {
                case 1: _args.resultado = input.readI32(); break;
                case 2: _args.hasSgIdade = input.readBool(); break;
                case 3: _args.hasSgPercepcaoSaude = input.readBool(); break;
                case 4: _args.hasSgAvdInstrumental = input.readBool(); break;
                case 5: _args.hasSgAvdBasica = input.readBool(); break;
                case 6: _args.hasSgCognicao = input.readBool(); break;
                case 7: _args.hasSgHumor = input.readBool(); break;
                case 8: _args.hasSgAlcancePreensaoPinca = input.readBool(); break;
                case 9: _args.hasSgCapAerobicaMuscular = input.readBool(); break;
                case 10: _args.hasSgMarcha = input.readBool(); break;
                case 11: _args.hasSgContinencia = input.readBool(); break;
                case 12: _args.hasSgVisao = input.readBool(); break;
                case 13: _args.hasSgAudicao = input.readBool(); break;
                case 14: _args.hasSgComorbidade = input.readBool(); break;
                case 15: _args.dataResultado = input.readI64(); break;
                default: input.skip(fieldType);
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        return new IvcfThrift(_args);
    }
}
