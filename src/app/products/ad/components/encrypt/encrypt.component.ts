import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'carambola-encrypt',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatTabsModule,
  ],
  templateUrl: './encrypt.component.html',
  styleUrls: ['./encrypt.component.scss'],
})
export class EncryptComponent {
  private formBuilder = inject(UntypedFormBuilder);

  formGroupEncrypt: UntypedFormGroup;
  encrypt_ekey: Uint8Array = Uint8Array.from('');
  encrypt_ikey: Uint8Array = Uint8Array.from('');
  encrypt_iv: Uint8Array = Uint8Array.from('');
  encrypt_price: Uint8Array = Uint8Array.from('');
  encrypt_pad: Uint8Array = Uint8Array.from('');
  encrypt_enc_price: Uint8Array = Uint8Array.from('');
  encrypt_signature: Uint8Array = Uint8Array.from('');
  encrypt_message: Uint8Array = Uint8Array.from('');
  encrypt_final_message = '';

  formGroupDecrypt: UntypedFormGroup;
  decrypt_ekey: Uint8Array = Uint8Array.from('');
  decrypt_ikey: Uint8Array = Uint8Array.from('');
  decrypt_iv: Uint8Array = Uint8Array.from('');
  decrypt_price: Uint8Array = Uint8Array.from('');
  decrypt_pad: Uint8Array = Uint8Array.from('');
  decrypt_enc_price: Uint8Array = Uint8Array.from('');
  decrypt_signature: Uint8Array = Uint8Array.from('');
  decrypt_message: Uint8Array = Uint8Array.from('');
  decrypt_final_price = NaN;

  rustCode = `
    use base64::prelude::*;
    use hmac::{Hmac, Mac};
    use sha1::Sha1;

    type HmacSha1 = Hmac<Sha1>;

    fn encrypt_price(price: i32, iv: String, ekey: String, ikey: String) -> String {
      let mut ekey_base64 = ekey.replace('-', '+').replace('_', '/');
      while ekey_base64.len() % 4 != 0 {
          ekey_base64.push_str('=');
      }
      let ekey = BASE64_STANDARD.decode(ekey_base64);
      let mut ikey_base64 = ikey.replace('-', '+').replace('_', '/');
      while ikey_base64.len() % 4 != 0 {
          ikey_base64.push_str('=');
      }
      let ikey = BASE64_STANDARD.decode(ikey_base64);
      if ekey.is_err() || ikey.is_err() {
          return ''.to_string();
      }
      let ekey = ekey.unwrap();
      let ikey = ikey.unwrap();

      let price_bytes = u64::to_be_bytes(price as u64).to_vec();
      let iv_bytes = match iv.parse::<u128>() {
          Ok(number) => u128::to_be_bytes(number),
          Err(_) => u128::to_be_bytes(0)
      };

      let mut price_pad: Vec<u8> = [].to_vec();
      let mac_ekey = HmacSha1::new_from_slice(&ekey);
      match mac_ekey {
          Ok(mut mac) => {
              mac.update(&iv_bytes.to_vec());
              price_pad = mac.finalize().into_bytes().to_vec();
          },
          Err(_) => (),
      }

      let enc_price: Vec<u8> = price_bytes.iter()
          .zip(price_pad[0..8].iter())
          .map(|(&x1, &x2)| x1 ^ x2)
          .collect();

      let mut sig = [].to_vec();
      let mac_ikey = HmacSha1::new_from_slice(&ikey);
      match mac_ikey {
          Ok(mut mac) => {
              mac.update(&[price_bytes.to_vec(), iv_bytes.to_vec()].concat());
              sig = mac.finalize().into_bytes().to_vec();
          },
          Err(_) => (),
      }
      let signature = sig[0..4].to_vec();

      let message_base64 = BASE64_STANDARD.encode(&[iv_bytes.to_vec(), enc_price.to_vec(), signature.to_vec()].concat());

      message_base64.replace('+', '-').replace('/', '_').replace('=', '')
    }
  `;

  javaCode = `
    import java.io.ByteArrayOutputStream;
    import java.io.IOException;
    import java.nio.ByteBuffer;
    import java.security.InvalidKeyException;
    import java.security.NoSuchAlgorithmException;
    import java.util.Base64;

    import javax.crypto.Mac;
    import javax.crypto.spec.SecretKeySpec;

    public String encrypt(Integer price, long iv, String ekeyString, String ikeyString)
            throws IOException, NoSuchAlgorithmException, InvalidKeyException {
        ekeyString = ekeyString.replace('-', '+').replace('_', '/');
        while (ekeyString.length() % 4 != 0) {
            ekeyString = ekeyString.concat('=');
        }
        SecretKeySpec ekey = new SecretKeySpec(Base64.getDecoder().decode(ekeyString), 'HmacSHA1');
        ikeyString = ikeyString.replace('-', '+').replace('_', '/');
        while (ikeyString.length() % 4 != 0) {
            ikeyString = ikeyString.concat('=');
        }
        SecretKeySpec ikey = new SecretKeySpec(Base64.getDecoder().decode(ikeyString), 'HmacSHA1');
        byte[] priceBytes = ByteBuffer.allocate(8).putInt(4, price).array();
        byte[] ivBytes = ByteBuffer.allocate(16).putLong(8, iv).array();

        Mac mac = Mac.getInstance('HmacSHA1');
        mac.init(ekey);

        byte[] pad = mac.doFinal(ivBytes);

        byte encPrice[] = new byte[8];
        for (int i = 0; i < 8; i++) {
            encPrice[i] = (byte) (pad[i] ^ priceBytes[i]);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream( );
        outputStream.write(priceBytes);
        outputStream.write(ivBytes);

        mac = Mac.getInstance('HmacSHA1');
        mac.init(ikey);
        byte[] signature = mac.doFinal(outputStream.toByteArray());
        outputStream.close();

        outputStream = new ByteArrayOutputStream( );
        outputStream.write(ivBytes, 0, 16);
        outputStream.write(encPrice, 0, 8);
        outputStream.write(signature, 0, 4);

        byte[] messageBytes = outputStream.toByteArray();
        outputStream.close();

        String messageBase64 = Base64.getEncoder().encodeToString(messageBytes);
        messageBase64 = messageBase64.replace('+', '-').replace('/', '_').replace('=', '');

        return messageBase64;
    }
  `;

  tsCode = `
    async encrypt(price: number, iv: string, ekey: string, ikey: string): Promise<string> {
      let encrypt_ekey: Uint8Array = Uint8Array.from('');
      let encrypt_ikey: Uint8Array = Uint8Array.from('');
      let encrypt_iv: Uint8Array = Uint8Array.from('');
      let encrypt_price: Uint8Array = Uint8Array.from('');
      let encrypt_pad: Uint8Array = Uint8Array.from('');
      let encrypt_enc_price: Uint8Array = Uint8Array.from('');
      let encrypt_signature: Uint8Array = Uint8Array.from('');
      let encrypt_message: Uint8Array = Uint8Array.from('');
      let encrypt_final_message = '';

      ekey = ekey.replaceAll('-', '+').replaceAll('_', '/');
      while (ekey.length % 4 > 0) {
        ekey += '=';
      }
      encrypt_ekey = Uint8Array.from(atob(ekey), c => c.charCodeAt(0));

      ikey = ikey.replaceAll('-', '+').replaceAll('_', '/');
      while (ikey.length % 4 > 0) {
        ikey += '=';
      }
      encrypt_ikey = Uint8Array.from(atob(ikey), c => c.charCodeAt(0));

      encrypt_iv = this.int2buf(BigInt(iv), 16, 8);

      encrypt_price = this.int2buf(BigInt(price), 8, 0);

      encrypt_pad = (await this.hmacSha1(encrypt_ekey, encrypt_iv)).subarray(0, 8);

      encrypt_enc_price = Uint8Array.from(encrypt_price);
      for (let i = 0; i < 8; i++) {
        encrypt_enc_price[i] ^= encrypt_pad[i];
      }

      encrypt_signature = (await this.hmacSha1(encrypt_ikey, this.concatUint8Arrays([encrypt_price, encrypt_iv]))).subarray(0, 4);

      encrypt_message = this.concatUint8Arrays([encrypt_iv, encrypt_enc_price, encrypt_signature]);

      encrypt_final_message = btoa(String.fromCharCode(...encrypt_message)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

      return encrypt_final_message;
    }

    concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
      const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
      }
      return result;
    }

    async hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
      const safeKey = this.toArrayBufferView(key);
      const safeData = this.toArrayBufferView(data);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        safeKey,
        {name: 'HMAC', hash: 'SHA-1'},
        false,
        ['sign'],
      );
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, safeData);
      return new Uint8Array(signature);
    }

    toArrayBufferView(data: Uint8Array): Uint8Array<ArrayBuffer> {
      return new Uint8Array(data.slice());
    }

    int2buf(x: bigint, size: number, offset: number): Uint8Array {
      const buffer = new Uint8Array(size);
      const view = new DataView(buffer.buffer);
      view.setBigUint64(offset, x, false); // false for big-endian
      return buffer;
    }
  `;

  constructor() {
    this.formGroupEncrypt = this.formBuilder.group({
      'ekey': ['skU7Ax_NL5pPAFyKdkfZjZz2-VhIN8bjj1rVFOaJ_5o=', Validators.required],
      'ikey': ['arO23ykdNqUQ5LEoQ0FVmPkBd7xB5CO89PDZlSjpFxo=', Validators.required],
      'iv': [7404904667802501121n, Validators.pattern('^[0-9]*$')],
      'price': [100, [Validators.required, Validators.pattern('^[0-9]*$')]],
    });

    this.formGroupDecrypt = this.formBuilder.group({
      'ekey': ['skU7Ax_NL5pPAFyKdkfZjZz2-VhIN8bjj1rVFOaJ_5o=', Validators.required],
      'ikey': ['arO23ykdNqUQ5LEoQ0FVmPkBd7xB5CO89PDZlSjpFxo=', Validators.required],
      'message': ['AAAAAAAAAABmw4GQAAAAAW2XFHAD9G7IW8gQeA', Validators.required],
    });
  }

  async encrypt() {
    if (!this.formGroupEncrypt.valid) {
      this.formGroupEncrypt.markAllAsTouched();
      return;
    }

    this.encrypt_ekey = Uint8Array.from('');
    this.encrypt_ikey = Uint8Array.from('');
    this.encrypt_iv = Uint8Array.from('');
    this.encrypt_price = Uint8Array.from('');
    this.encrypt_pad = Uint8Array.from('');
    this.encrypt_enc_price = Uint8Array.from('');
    this.encrypt_signature = Uint8Array.from('');
    this.encrypt_message = Uint8Array.from('');
    this.encrypt_final_message = '';

    let ekey: string = this.formGroupEncrypt.value.ekey.replaceAll('-', '+').replaceAll('_', '/');
    while (ekey.length % 4 > 0) {
      ekey += '=';
    }
    this.encrypt_ekey = Uint8Array.from(atob(ekey), c => c.charCodeAt(0));

    let ikey: string = this.formGroupEncrypt.value.ikey.replaceAll('-', '+').replaceAll('_', '/');
    while (ikey.length % 4 > 0) {
      ikey += '=';
    }
    this.encrypt_ikey = Uint8Array.from(atob(ikey), c => c.charCodeAt(0));

    this.encrypt_iv = this.int2buf(BigInt(this.formGroupEncrypt.value.iv), 16, 8);

    this.encrypt_price = this.int2buf(BigInt(this.formGroupEncrypt.value.price), 8, 0);

    this.encrypt_pad = (await this.hmacSha1(this.encrypt_ekey, this.encrypt_iv)).subarray(0, 8);

    this.encrypt_enc_price = Uint8Array.from(this.encrypt_price);
    for (let i = 0; i < 8; i++) {
      this.encrypt_enc_price[i] ^= this.encrypt_pad[i];
    }

    this.encrypt_signature = (await this.hmacSha1(this.encrypt_ikey, this.concatUint8Arrays([this.encrypt_price, this.encrypt_iv]))).subarray(0, 4);

    this.encrypt_message = this.concatUint8Arrays([this.encrypt_iv, this.encrypt_enc_price, this.encrypt_signature]);

    this.encrypt_final_message = btoa(String.fromCharCode(...this.encrypt_message)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }

  async decrypt() {
    if (!this.formGroupDecrypt.valid) {
      this.formGroupDecrypt.markAllAsTouched();
      return;
    }

    this.decrypt_ekey = Uint8Array.from('');
    this.decrypt_ikey = Uint8Array.from('');
    this.decrypt_iv = Uint8Array.from('');
    this.decrypt_price = Uint8Array.from('');
    this.decrypt_pad = Uint8Array.from('');
    this.decrypt_enc_price = Uint8Array.from('');
    this.decrypt_signature = Uint8Array.from('');
    this.decrypt_message = Uint8Array.from('');
    this.decrypt_final_price = NaN;

    let ekey = this.formGroupDecrypt.value.ekey.replaceAll('-', '+').replaceAll('_', '/');
    while (ekey.length % 4 > 0) {
      ekey += '=';
    }
    this.decrypt_ekey = Uint8Array.from(atob(ekey), c => c.charCodeAt(0));

    let ikey = this.formGroupDecrypt.value.ikey.replaceAll('-', '+').replaceAll('_', '/');
    while (ikey.length % 4 > 0) {
      ikey += '=';
    }
    this.decrypt_ikey = Uint8Array.from(atob(ikey), c => c.charCodeAt(0));

    let message = this.formGroupDecrypt.value.message.replaceAll('-', '+').replaceAll('_', '/');
    while (message.length % 4 > 0) {
      message += '=';
    }
    this.decrypt_message = Uint8Array.from(atob(message), c => c.charCodeAt(0));

    this.decrypt_iv = this.decrypt_message.subarray(0, 16);

    this.decrypt_enc_price = this.decrypt_message.subarray(16, 24);

    this.decrypt_signature = this.decrypt_message.subarray(24, 28);

    this.decrypt_pad = (await this.hmacSha1(this.decrypt_ekey, this.decrypt_iv)).subarray(0, 8);

    this.decrypt_price = Uint8Array.from(this.decrypt_enc_price);
    for (let i = 0; i < 8; i++) {
      this.decrypt_price[i] ^= this.decrypt_pad[i];
    }

    this.decrypt_final_price = Number(this.buf2int(this.decrypt_price));
  }

  concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  async hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const safeKey = this.toArrayBufferView(key);
    const safeData = this.toArrayBufferView(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      safeKey,
      {name: 'HMAC', hash: 'SHA-1'},
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, safeData);
    return new Uint8Array(signature);
  }

  toArrayBufferView(data: Uint8Array): Uint8Array<ArrayBuffer> {
    return new Uint8Array(data.slice());
  }

  buf2hex(buffer: Uint8Array) {
    return [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join(' ');
  }

  int2buf(x: bigint, size: number, offset: number): Uint8Array {
    const buffer = new Uint8Array(size);
    const view = new DataView(buffer.buffer);
    view.setBigUint64(offset, x, false); // false for big-endian
    return buffer;
  }

  buf2int(buffer: Uint8Array): bigint {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return view.getBigUint64(0, false); // false for big-endian
  }

}
