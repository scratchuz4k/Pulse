using Microsoft.EntityFrameworkCore;
using Pulse.Server.Models;

namespace Pulse.Server.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Dev: delete pulse.db and restart to apply schema — EnsureCreated does not migrate existing DBs.
    public DbSet<Room> Rooms => Set<Room>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Room>()
            .HasIndex(r => r.Name)
            .IsUnique();
    }
}
