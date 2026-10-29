"""Copy MuseScore_General and boost the bow-attack ('_Att') layers of the Fast string presets,
so short notes get a spiccato/marcato bite.  In-place edit of pgen initialAttenuation amounts."""
import struct, sys, shutil
src, dst, new_att = sys.argv[1], sys.argv[2], int(sys.argv[3])
targets = [(int(x.split(':')[0]), int(x.split(':')[1])) for x in sys.argv[4:]]
data = bytearray(open(src, 'rb').read())
p = data.find(b'pdta')
def chunk(tag):
    j = data.find(tag, p); size = struct.unpack('<I', data[j+4:j+8])[0]; return j+8, size
ph_o, ph_s = chunk(b'phdr'); pb_o, pb_s = chunk(b'pbag'); pg_o, pg_s = chunk(b'pgen'); in_o, in_s = chunk(b'inst')
P = [(bytes(data[ph_o+i*38:ph_o+i*38+20]).split(b'\0')[0].decode('latin1'),) + struct.unpack('<HHH', data[ph_o+i*38+20:ph_o+i*38+26]) for i in range(ph_s//38)]
PB = [struct.unpack('<HH', data[pb_o+i*4:pb_o+i*4+4]) for i in range(pb_s//4)]
I = [bytes(data[in_o+i*22:in_o+i*22+20]).split(b'\0')[0].decode('latin1') for i in range(in_s//22)]
n = 0
for k, (name, prog, bank, bagi) in enumerate(P[:-1]):
    if (bank, prog) not in targets: continue
    for bb in range(bagi, P[k+1][3]):
        g0, g1 = PB[bb][0], PB[bb+1][0]
        inst = None; att_pos = None
        for g in range(g0, g1):
            op, amt = struct.unpack('<Hh', data[pg_o+g*4:pg_o+g*4+4])
            if op == 41: inst = I[amt]
            if op == 48: att_pos = pg_o+g*4+2
        if inst and '_Att' in inst and att_pos:
            old = struct.unpack('<h', data[att_pos:att_pos+2])[0]
            struct.pack_into('<h', data, att_pos, new_att)
            print(f'{name}: {inst} initAtten {old} -> {new_att}'); n += 1
open(dst, 'wb').write(data)
print('patched', n)
