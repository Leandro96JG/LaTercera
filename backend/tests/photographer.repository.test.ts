import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryPhotographerRepository } from '../src/repositories/photographer.repository';

describe('PhotographerRepository (TDD)', () => {
  let repo: MemoryPhotographerRepository;

  beforeEach(() => {
    repo = new MemoryPhotographerRepository();
  });

  it('debe encontrar a la fotógrafa oficial Jenifer "Yuyo" Espeche por email', async () => {
    const admin = await repo.findByEmail('fotografa@latercera.com.ar');
    expect(admin).not.toBeNull();
    expect(admin?.name).toContain('Jenifer "Yuyo" Espeche');
    expect(admin?.role).toBe('admin');
    expect(admin?.passwordHash).toMatch(/^scrypt:/);
  });

  it('debe crear un nuevo fotógrafo colaborador persistido', async () => {
    const created = await repo.createPhotographer({
      email: 'colaborador@latercera.com.ar',
      name: 'Carlos Fotografía Deportiva',
      passwordHash: 'scrypt:salt:hash',
      phone: '+54 9 380 400-0000',
      role: 'photographer'
    });

    expect(created.email).toBe('colaborador@latercera.com.ar');
    expect(created.name).toBe('Carlos Fotografía Deportiva');
    expect(created.role).toBe('photographer');

    const retrieved = await repo.findByEmail('colaborador@latercera.com.ar');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(created.id);
  });

  it('debe rechazar la creación de un fotógrafo con email duplicado', async () => {
    await expect(
      repo.createPhotographer({
        email: 'fotografa@latercera.com.ar',
        name: 'Duplicado',
        passwordHash: 'scrypt:salt:hash'
      })
    ).rejects.toThrow('ya existe');
  });
});
