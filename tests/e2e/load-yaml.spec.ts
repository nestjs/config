import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Files', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withYamlConfigurations()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded configuration (injected through constructor)`, () => {
    const config = app.get(AppModule).getYamlConfig();

    let jsonData = JSON.parse(config.yamlArray);
    //http
    expect(jsonData.http.host).toEqual('localhost');
    expect(jsonData.http.port).toEqual(8080);

    //https
    expect(jsonData.https.host).toEqual('localhost');
    expect(jsonData.https.port).toEqual(8443);
    expect(jsonData.https.tls).toEqual('tls.key');

    //admin
    expect(jsonData.admin.host).toEqual('localhost');
    expect(jsonData.admin.port).toEqual(9080);

    //serviceEndpoints
    expect(jsonData.serviceEndpoints.cats.url).toEqual(
      'http://localhost/cats/',
    );
    expect(jsonData.serviceEndpoints.dogs.url).toEqual(
      'http://localhost/dogs/',
    );

    //db
    expect(jsonData.db.postgres.url).toEqual('localhost');
    expect(jsonData.db.postgres.port).toEqual(5432);
    expect(jsonData.db.postgres.database).toEqual('yaml-db');
    expect(jsonData.db.sqlite.database).toEqual('sqlite.db');
  });

  afterEach(async () => {
    await app.close();
  });
});
